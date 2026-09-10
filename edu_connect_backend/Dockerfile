FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TZ=UTC

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Use a stable non-root UID so VPS-mounted keys can be permissioned precisely.
# Creating the volume mount points in the image also preserves their ownership
# when Docker initializes an empty named volume.
RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /app/private_media /app/secrets \
    && chown -R 10001:10001 /app
USER 10001:10001

# Ensure scripts are executable
RUN chmod +x scripts/*.sh 2>/dev/null || true

EXPOSE 8000

# Run migrations, then start Uvicorn behind Caddy.
CMD ["sh", "scripts/start.sh"]
