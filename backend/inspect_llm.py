
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import LLMProvider

try:
    p = LLMProvider.objects.filter(is_active=True).first()
    if p:
        print(f"ACTIVE_PROVIDER_TYPE: {p.provider_type}")
        print(f"ACTIVE_BASE_URL: {p.base_url}")
        print(f"ACTIVE_API_KEY_PREFIX: {p.api_key[:10] if p.api_key else 'None'}")
    else:
        print("NO_ACTIVE_PROVIDER")
except Exception as e:
    print(f"ERROR: {e}")
