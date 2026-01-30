import logging

SERVICE = "attendance-backend"

def get_logger(name: str):
    return logging.getLogger(f"{SERVICE}.{name}")
