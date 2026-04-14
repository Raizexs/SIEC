# scraper/Dockerfile
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Zona horaria Chile (requerida por APScheduler / CronTrigger)
ENV TZ=America/Santiago
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# El browser Chromium ya viene instalado en la imagen base de Playwright
# playwright install chromium  ← no necesario con esta imagen base

CMD ["python", "main.py"]
