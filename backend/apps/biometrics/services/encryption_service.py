"""Module backend/apps/biometrics/services/encryption_service.py

Auto-generated module docstring.
"""

from cryptography.fernet import Fernet
from django.conf import settings

fernet = Fernet(settings.BIOMETRIC_SECRET_KEY)

def decrypt_template(encrypted_bytes: bytes) -> bytes:
    """Decrypt stored biometric template bytes using the configured key.

    Parameters:
    - `encrypted_bytes` (bytes): ciphertext produced by `encrypt_template`.

    Returns:
    - bytes: raw decrypted template bytes.
    """
    return fernet.decrypt(encrypted_bytes)

def encrypt_template(raw_bytes: bytes) -> bytes:
    """Encrypt raw biometric template bytes using the configured key.

    Parameters:
    - `raw_bytes` (bytes): raw template bytes to encrypt.

    Returns:
    - bytes: encrypted ciphertext to store in the database.
    """
    return fernet.encrypt(raw_bytes)
