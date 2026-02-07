from pathlib import Path
import os
from datetime import timedelta

from dotenv import load_dotenv
import dj_database_url

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================
# CORE SECURITY
# =========================

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

DEBUG = os.getenv("DEBUG", "False") == "True"

ALLOWED_HOSTS = ["*"]

# =========================
# APPLICATIONS
# =========================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",

    # Local apps
    "accounts",
    "attendance",
    "employees",
    "biometrics",
]

AUTH_USER_MODEL = "accounts.User"

# =========================
# MIDDLEWARE
# =========================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# =========================
# URLS / WSGI
# =========================

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# =========================
# TEMPLATES
# =========================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# =========================
# DATABASE
# =========================

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        ssl_require=False,
    )
}

# =========================
# PASSWORD VALIDATION
# =========================

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# =========================
# INTERNATIONALIZATION
# =========================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# =========================
# STATIC & MEDIA
# =========================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =========================
# DJANGO REST FRAMEWORK
# =========================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# =========================
# SIMPLE JWT
# =========================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
}

# =========================
# SPECTACULAR
# =========================

SPECTACULAR_SETTINGS = {
    "TITLE": "Attendance Management API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SECURITY": [{"bearerAuth": []}],
}

# =========================
# BIOMETRICS
# =========================

BIOMETRIC_SECRET_KEY = os.getenv("BIOMETRIC_SECRET_KEY")
if not BIOMETRIC_SECRET_KEY:
    raise RuntimeError("BIOMETRIC_SECRET_KEY is not set")

# =========================
# CORS
# =========================

CORS_ALLOW_ALL_ORIGINS = True

# =========================
# LOGGING
# =========================

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
