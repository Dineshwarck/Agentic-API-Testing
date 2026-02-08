import os
import sys


# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


from core.models import LLMProvider

def check_settings():
    print("--- Active LLM Provider ---")
    provider = LLMProvider.objects.filter(is_active=True).first()
    if provider:
        print(f"Name: {provider.name}")
        print(f"Type: {provider.provider_type}")
        print(f"Base URL: {provider.base_url}")
        print(f"Model: {provider.default_model}")
        print(f"API Key (Masked): {provider.api_key[:8]}...{provider.api_key[-4:] if len(provider.api_key) > 4 else ''}")
    else:
        print("❌ No Active Provider Found!")

if __name__ == "__main__":
    check_settings()
