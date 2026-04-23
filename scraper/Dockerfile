# scraper/Dockerfile
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Zona horaria Chile (requerida por APScheduler / CronTrigger)
ENV TZ=America/Santiago
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar Chromium con todas sus dependencias del sistema
# (Criterio de validación SCRUM-55: el Dockerfile ejecuta este comando durante el build)
RUN playwright install --with-deps chromium

# Copiar código fuente
COPY . .

CMD ["python", "main.py"]
