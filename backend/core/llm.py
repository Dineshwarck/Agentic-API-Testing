
import os
import json
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

# Async DB access
from asgiref.sync import sync_to_async
from core.models import LLMProvider

# Adapters
import google.genai as genai
from openai import AsyncOpenAI
from .utils_llm import function_to_openai_schema, execute_tool_call
import inspect # For inspecting async functions
import httpx # Fix for http_client proxies issue
from google.ai import generativelanguage as glm # For access to FunctionResponse protos

class BaseLLMAdapter(ABC):
    def __init__(self, api_key: str, model: str, base_url: str = None):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url

    @abstractmethod
    async def generate_text(self, system_prompt: str, user_prompt: str, tools: List[Any] = None, on_log=None) -> str:
        pass

class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, model: str, base_url: str = None):
        super().__init__(api_key, model, base_url)
        genai.configure(api_key=self.api_key)
        
    async def generate_text(self, system_prompt: str, user_prompt: str, tools: List[Any] = None, on_log=None) -> str:
        # Note: 'model' in Adapter includes 'models/' prefix if needed, or handled here.
        model_name = self.model
        if not model_name.startswith("models/") and "gemini" in model_name:
             # Best effort prefixing
             pass

        # Use gemini-flash-latest fallback if configured model is generic
        target_model = model_name
        
        try:
            # Configure Model with Tools
            model = genai.GenerativeModel(
                model_name=target_model,
                system_instruction=system_prompt,
                tools=tools
            )
            
            # Start Chat (Manual Loop)
            chat = model.start_chat(enable_automatic_function_calling=False) 
            
            # 1. First Call
            response = await chat.send_message_async(user_prompt)
            
            # Trace Log
            execution_trace = []
            
            # 2. Tool Loop
            while True:
                # Handle empty parts
                if not response.parts:
                     break
                     
                part = response.parts[0] 
                
                # Capture Thought/Reasoning
                if part.text:
                    log_msg = f"🧠 Reasoning/Thought:\n{part.text}\n"
                    execution_trace.append(log_msg)
                    if on_log: await on_log(log_msg)
                
                # Check for function call
                if fn := part.function_call:
                    func_name = fn.name
                    args = {k: v for k, v in fn.args.items()}
                    
                    tool_msg = f"🛠️ Executing Tool: {func_name}\nArgs: {json.dumps(args, indent=2)}\n"
                    execution_trace.append(tool_msg)
                    if on_log: await on_log(tool_msg)
                    
                    print(f"Gemini Calling Tool: {func_name}")
                    
                    # Execute Tool
                    tools_map = {t.__name__: t for t in tools}
                    
                    if func_name in tools_map:
                        func = tools_map[func_name]
                        try:
                            if inspect.iscoroutinefunction(func):
                                result = await func(**args)
                            else:
                                from asgiref.sync import sync_to_async
                                result = await sync_to_async(func)(**args)
                        except Exception as e:
                            result = f"Error: {e}"
                    else:
                        result = f"Error: Tool {func_name} not found."
                        
                    res_msg = f"✅ Tool Output:\n{str(result)[:500]}... (truncated)\n"
                    execution_trace.append(res_msg)
                    if on_log: await on_log(res_msg)

                    # Send result back
                    response = await chat.send_message_async(
                        glm.Content(
                            parts=[glm.Part(
                                function_response=glm.FunctionResponse(
                                    name=func_name,
                                    response={'result': str(result)} 
                                )
                            )]
                        )
                    )
                    continue # Loop to process next step
                
                # If text, we are done
                if part.text:
                    full_log = "\n".join(execution_trace)
                    final_res = f"{full_log}\n\n📝 Final Response:\n{part.text}"
                    return final_res
                    
                if response.prompt_feedback and response.prompt_feedback.block_reason:
                     return f"Blocked: {response.prompt_feedback.block_reason}"
                
                # Fallback for unexpected state
                return response.text
                
        except Exception as e:
            print(f"Gemini Error: {e}")
            raise e

class OpenAIAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, model: str, base_url: str = None):
        super().__init__(api_key, model, base_url)
        # Fix: Explicitly pass http_client to avoid 'proxies' kwarg error in newer openai/httpx versions
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            http_client=httpx.AsyncClient()
        )

    def _convert_tools(self, tools: List[Any]) -> List[Dict]:
        # TODO: Implement conversion if tools are Python functions.
        # For now, simplistic approach or skipping tool usage for MVP on OpenAI path 
        # unless structured output is used.
        # User request implies simply using Groq/OpenAI for generation.
        # If tools are needed (Document Analysis), we need manual execution loop.
        # For MVP, we might bypass tools if using OpenAI or implement a ToolExecutor.
        return []

    async def generate_text(self, system_prompt: str, user_prompt: str, tools: List[Any] = None, on_log=None) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Prepare Request Kwargs
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2
        }
        
        if tools:
            openai_tools = [function_to_openai_schema(t) for t in tools]
            tools_map = {t.__name__: t for t in tools}
            kwargs["tools"] = openai_tools
            kwargs["tool_choice"] = "auto"
            
        try:
            # 1. First Call
            # FORCE DEBUG EXCEPTION
            key_preview = self.client.api_key[:10] + "..." + self.client.api_key[-4:] if self.client.api_key else "None"
            debug_msg = f"DEBUG FATAL CHECK: URL={self.client.base_url} | KEY={key_preview}"
            print(debug_msg) # Keep print just in case
            raise Exception(debug_msg) 
            
            response = await self.client.chat.completions.create(**kwargs)
            
            message = response.choices[0].message
            
            # 2. Tool Loop
            while True:
                # Check for tool_calls (Native)
                if message.tool_calls:
                    # Append the assistant's request to history
                    messages.append(message)
                    
                    for tool_call in message.tool_calls:
                        if on_log: await on_log(f"🛠️ Executing Tool: {tool_call.function.name}")
                        print(f"Calling Tool: {tool_call.function.name}")
                        result = await execute_tool_call(tool_call, tools_map)
                        if on_log: await on_log(f"✅ Tool Output: {str(result)[:200]}...")
                        
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": str(result)
                        })
                
                # Check for JSON Tool Call in Content (Fallback for local models like Qwen)
                elif message.content and message.content.strip().startswith('{') and '"name":' in message.content:
                    # Attempt to parse as tool call
                    print("DEBUG: Checking content for JSON tool call...")
                    try:
                        # Clean up markdown if present
                        content = message.content.strip()
                        if content.startswith("```json"):
                            content = content.replace("```json", "").replace("```", "").strip()
                        elif content.startswith("```"):
                            content = content.replace("```", "").strip()
                            
                        data = json.loads(content)
                        if "name" in data and "arguments" in data:
                            func_name = data["name"]
                            args = data["arguments"]
                            
                            # Log and Execute
                            if on_log: await on_log(f"🛠️ Executing Tool (JSON): {func_name}")
                            print(f"Calling Tool (JSON): {func_name}")
                            
                            # Manually execute since we don't have a tool_call ID
                            if func_name in tools_map:
                                func = tools_map[func_name]
                                try:
                                    if inspect.iscoroutinefunction(func):
                                        result = await func(**args)
                                    else:
                                        from asgiref.sync import sync_to_async
                                        result = await sync_to_async(func)(**args)
                                except Exception as e:
                                    result = f"Error: {e}"
                            else:
                                result = f"Error: Tool {func_name} not found."

                            if on_log: await on_log(f"✅ Tool Output: {str(result)[:200]}...")
                            
                            # Append interaction to history
                            messages.append({"role": "assistant", "content": message.content})
                            messages.append({
                                "role": "user", 
                                "content": f"Tool '{func_name}' Output: {result}"
                            })
                            
                            # Force loop continue to get next response
                            response = await self.client.chat.completions.create(
                                model=self.model,
                                messages=messages,
                                tools=openai_tools,
                                temperature=0.2
                            )
                            message = response.choices[0].message
                            continue
                            
                    except json.JSONDecodeError:
                        pass # Not JSON, treat as text
                    except Exception as e:
                        print(f"Fallback Tool execution error: {e}")
                        
                    # If we got here, it wasn't a valid tool call or execution finished and we return content
                    return message.content
                else:
                    return message.content

                # 3. Follow-up Call (Only if native tool_calls were processed)
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=openai_tools,
                    temperature=0.2
                )
                message = response.choices[0].message
            
        except Exception as e:
            print(f"OpenAI/Groq Error: {e}")
            raise e

async def get_active_llm():
    """Factory to get the active LLM Adapter"""
    try:
        # Native Async ORM (Django 4.1+)
        provider = await LLMProvider.objects.filter(is_active=True).afirst()
        
        if provider:
             print(f"DEBUG: get_active_llm found provider: {provider.provider_type}")
             print(f"DEBUG: API Key Prefix: {provider.api_key[:10] if provider.api_key else 'None'}")
             print(f"DEBUG: Base URL: {provider.base_url}")
        
        if not provider:
            raise ValueError("No active LLM Provider configured in Settings.")
            
        if provider.provider_type == 'GEMINI':
            return GeminiAdapter(provider.api_key, provider.default_model)
        elif provider.provider_type == 'OPENAI':
            return OpenAIAdapter(provider.api_key, provider.default_model, provider.base_url)
        elif provider.provider_type == 'OLLAMA':
            # Ollama is OpenAI compatible
            base_url = provider.base_url or "http://localhost:11434/v1"
            return OpenAIAdapter(provider.api_key or "ollama", provider.default_model, base_url)
            
    except Exception as e:
        print(f"Factory Error: {e}")
        raise e # Re-raise to see the actual error instead of silently falling back
