
from core.models import Document
import os
# Force allow async unsafe for tools used by GenAI SDK
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
from django.conf import settings
import PyPDF2
from django.utils.asyncio import async_unsafe

@async_unsafe
def list_documents(project_id: str) -> str:
    """Lists all available documents for the specified project.
    
    Args:
        project_id (str): The ID of the project to list documents for.
        
    Returns:
        str: A formatted list of document names and IDs.
    """
    try:
        docs = Document.objects.filter(project_id=project_id)
        if not docs.exists():
            return "No documents found for this project."
            
        result = "Available Documents:\n"
        for doc in docs:
            result += f"- {doc.name} (ID: {doc.id}, Type: {doc.doc_type})\n"
        return result
    except Exception as e:
        return f"Error listing documents: {str(e)}"

@async_unsafe
def read_document(project_id: str, document_name: str) -> str:
    """Reads the text content of a document by its name.
    
    Args:
        project_id (str): The ID of the project the document belongs to.
        document_name (str): The exact name of the document to read.
        
    Returns:
        str: The text content of the document.
    """
    doc = Document.objects.filter(project_id=project_id, name=document_name).first()
    if not doc:
        return f"Error: Document '{document_name}' not found."

    file_path = os.path.join(settings.MEDIA_ROOT, doc.file.name)
    
    if not os.path.exists(file_path):
        return "Error: File not found on server."
        
    try:
        ext = doc.name.lower()
        
        # Handle PDF
        if ext.endswith('.pdf'):
            text = ""
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text
        
        # Handle DOCX
        elif ext.endswith('.docx'):
            import docx
            doc_obj = docx.Document(file_path)
            return "\n".join([para.text for para in doc_obj.paragraphs])
            
        # Handle Text-based files (md, txt, json, yaml, xml, py, js, etc.)
        else:
            # Attempt to read as text
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except UnicodeDecodeError:
                # Fallback for other encodings or binary files
                return f"Error: Could not decode text file '{doc.name}'. The format might not be supported."
                
    except Exception as e:
        return f"Error reading file: {str(e)}"
