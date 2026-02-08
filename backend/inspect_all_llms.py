
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import LLMProvider

active_providers = LLMProvider.objects.filter(is_active=True)
print(f"COUNT: {active_providers.count()}")
for p in active_providers:
    print(f"ID: {p.id}, TYPE: {p.provider_type}, URL: {p.base_url}, KEY[:10]: {p.api_key[:10] if p.api_key else 'None'}")
