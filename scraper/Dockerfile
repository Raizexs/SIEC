# scraper/Dockerfile
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Zona horaria Chile (requerida por APScheduler / CronTrigger)
ENV TZ=America/Santiago
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Instalar Google Chrome para undetected-chromedriver
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
 && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar Chromium con todas sus dependencias del sistema
RUN playwright install --with-deps chromium

# Copiar código fuente
COPY . .

CMD ["python", "main.py"]
