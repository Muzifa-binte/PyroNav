# PyroNav backend image.
# Build from the REPOSITORY ROOT — the image also needs /shared-contracts:
#     docker build -f backend/Dockerfile -t pyronav-api .
# Usually started through docker-compose.yml at the repository root.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app/backend

# Dependencies first so code changes don't invalidate this layer
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY shared-contracts /app/shared-contracts
COPY backend /app/backend

RUN useradd --create-home --uid 10001 pyronav \
    && mkdir -p /app/backend/logs \
    && chown -R pyronav /app/backend/logs \
    && chmod +x /app/backend/docker-entrypoint.sh
USER pyronav

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/live', timeout=2).status != 200)"

ENTRYPOINT ["./docker-entrypoint.sh"]
