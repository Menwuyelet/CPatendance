# Use Python 3.10 slim image (better compatibility with some ML wheels like insightface/onnxruntime)
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable stdout/stderr immediately
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
# - opencv/onnxruntime may need libglib/libgl
# - insightface may compile native extensions (needs build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libglib2.0-0 \
    libgl1 \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only requirements first to use caching
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of your Django project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose the port Fly.io will use
EXPOSE 8080

# Start: run migrations then start Gunicorn
# (SQLite DB is created at runtime, so without this the app can crash with "no such table")
CMD ["sh", "-lc", "python manage.py migrate --noinput && gunicorn --bind 0.0.0.0:8080 config.wsgi:application"]
