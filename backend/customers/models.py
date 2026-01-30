
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

class Client(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    
    # Add other tenant fields here as needed
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Domain(DomainMixin):
    def __str__(self):
        return self.domain
