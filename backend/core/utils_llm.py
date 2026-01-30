import inspect
import json

def function_to_openai_schema(func):
    """
    Converts a Python function into an OpenAI function schema.
    Assumes Google-style or NumPy-style docstrings for description and args.
    """
    signature = inspect.signature(func)
    docstring = inspect.getdoc(func) or ""
    
    # Parse docstring roughly
    description = docstring.split("\n\n")[0].strip() if docstring else ""
    
    parameters = {
        "type": "object",
        "properties": {},
        "required": []
    }
    
    for name, param in signature.parameters.items():
        param_type = "string" # Default
        if param.annotation == int:
            param_type = "integer"
        elif param.annotation == bool:
            param_type = "boolean"
        elif param.annotation == float:
            param_type = "number"
            
        parameters["properties"][name] = {
            "type": param_type,
            "description": f"The {name} argument." # Placeholder if not parsed from doc
        }
        
        # Try to extract param description from docstring
        # Looking for "Args:\n  name (type): description"
        if "Args:" in docstring:
            args_section = docstring.split("Args:")[1].split("Returns:")[0]
            for line in args_section.split("\n"):
                if name in line:
                    # simplistic extraction: "name (type): description"
                    parts = line.split(":", 1)
                    if len(parts) > 1:
                        parameters["properties"][name]["description"] = parts[1].strip()
        
        if param.default == inspect.Parameter.empty:
            parameters["required"].append(name)
            
    return {
        "type": "function",
        "function": {
            "name": func.__name__,
            "description": description,
            "parameters": parameters
        }
    }

async def execute_tool_call(tool_call, tools_map):
    """
    Executes a tool call from OpenAI assistant.
    tools_map: dict of {function_name: function_object}
    """
    func_name = tool_call.function.name
    arguments = json.loads(tool_call.function.arguments)
    
    if func_name not in tools_map:
        return f"Error: Tool '{func_name}' not found."
        
    func = tools_map[func_name]
    
    # Check if func is async
    if inspect.iscoroutinefunction(func):
        return await func(**arguments)
    else:
        # Run sync function (possibly wrapped in sync_to_async if needed, or just call it)
        # In Django context, these tools have @async_unsafe so they can run in sync mode?
        # But if we are in async context, blocking call is bad.
        # But for MVP, direct call is okay if low latency.
        # Ideally should use sync_to_async(func)(**args)
        from asgiref.sync import sync_to_async
        return await sync_to_async(func)(**arguments)
