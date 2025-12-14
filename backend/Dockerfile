FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port (internal)
# Run command using PORT environment variable (default 8000)
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
