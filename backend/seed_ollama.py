import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import LLMProvider

def text_style(text, color_code):
    return f"\033[{color_code}m{text}\033[0m"

def seed_ollama():
    print(text_style("🚀 Configuring Ollama Provider...", "1;34"))
    
    provider_name = "Ollama Local"
    model_name = "qwen2.5-coder:7b"
    base_url = "http://localhost:11434/v1"
    
    # Check if exists
    provider, created = LLMProvider.objects.get_or_create(
        name=provider_name,
        defaults={
            "provider_type": "OLLAMA",
            "base_url": base_url,
            "api_key": "ollama", # Not used but required field
            "default_model": model_name,
            "is_active": True
        }
    )
    
    if not created:
        print(text_style(f"📝 Updating existing provider: {provider_name}", "1;33"))
        provider.provider_type = "OLLAMA"
        provider.base_url = base_url
        provider.default_model = model_name
        provider.is_active = True
        provider.save()
    else:
        print(text_style(f"✨ Created new provider: {provider_name}", "1;32"))
        
    print(text_style(f"\n✅ Active Provider: {provider.name}", "1;32"))
    print(f"   Model: {provider.default_model}")
    print(f"   URL:   {provider.base_url}")
    print(text_style("\nSystem is ready for local agentic testing!", "1;36"))

if __name__ == "__main__":
    seed_ollama()
