"""Module backend/apps/biometrics/services/encryption_service.py

This file contains the encrypting and decrypting methods to perform encryption tasks.
"""

from cryptography.fernet import Fernet
from django.conf import settings
from config.logging import get_logger

fernet = Fernet(settings.BIOMETRIC_SECRET_KEY)

logger = get_logger(__name__)


def decrypt_template(encrypted_bytes: bytes) -> bytes:
    """Decrypt stored biometric template bytes using the configured key.

    Parameters:
    - `encrypted_bytes` (bytes): ciphertext produced by `encrypt_template`.

    Returns:
    - bytes: raw decrypted template bytes.
    """

    logger.info(
        "BIOMETRIC_DECRYPT_STARTED | payload_size=%s",
        len(encrypted_bytes) if encrypted_bytes else 0,
    )

    decrypted = fernet.decrypt(encrypted_bytes)

    logger.info(
        "BIOMETRIC_DECRYPT_SUCCESS | decrypted_size=%s",
        len(decrypted) if decrypted else 0,
    )

    return decrypted


def encrypt_template(raw_bytes: bytes) -> bytes:
    """Encrypt raw biometric template bytes using the configured key.

    Parameters:
    - `raw_bytes` (bytes): raw template bytes to encrypt.

    Returns:
    - bytes: encrypted ciphertext to store in the database.
    """

    logger.info(
        "BIOMETRIC_ENCRYPT_STARTED | payload_size=%s",
        len(raw_bytes) if raw_bytes else 0,
    )

    encrypted = fernet.encrypt(raw_bytes)

    logger.info(
        "BIOMETRIC_ENCRYPT_SUCCESS | encrypted_size=%s",
        len(encrypted) if encrypted else 0,
    )

    return encrypted
