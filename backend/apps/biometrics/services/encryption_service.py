from cryptography.fernet import Fernet
from django.conf import settings

fernet = Fernet(settings.BIOMETRIC_SECRET_KEY)

def decrypt_template(encrypted_bytes: bytes) -> bytes:
    return fernet.decrypt(encrypted_bytes)

def encrypt_template(raw_bytes: bytes) -> bytes:
    return fernet.encrypt(raw_bytes)
