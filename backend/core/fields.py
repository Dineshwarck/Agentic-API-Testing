from django.db import models
from cryptography.fernet import Fernet
from django.conf import settings
import base64

class EncryptedCharField(models.TextField):
    """
    A custom field that encrypts data using Fernet before saving to the DB,
    and decrypts it when retrieving.
    Uses 'TextField' internally to avoid length limits on encrypted strings.
    """
    
    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            # Assumes settings.FERNET_KEYS exists and has at least one key
            # We use the first key for decryption (active key)
            # In a real system, you might try multiple keys for rotation.
            key = settings.FERNET_KEYS[0]
            f = Fernet(key)
            # Fernet expects bytes
            if isinstance(value, str):
                value_bytes = value.encode()
            else:
                value_bytes = value
                
            return f.decrypt(value_bytes).decode('utf-8')
        except Exception:
            # If decryption fails (e.g. data was plain text before encryption),
            # return the raw value. This allows for smooth migration.
            return value

    def get_prep_value(self, value):
        if value is None:
            return value
            
        # Re-encrypting explicitly every time we save ensures we assume `value` passed here is plain text.
        # However, if we unknowingly pass already encrypted data, we double encrypt. 
        # But standard Django flow is: Instance.field = "plain" -> save() -> get_prep_value().
        
        try:
            key = settings.FERNET_KEYS[0]
            f = Fernet(key)
            encrypted = f.encrypt(str(value).encode('utf-8'))
            return encrypted.decode('utf-8') # Return string for DB
        except Exception as e:
            # Should not fail to encrypt unless key is bad
            raise e
