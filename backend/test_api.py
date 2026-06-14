import urllib.request
import json

url = "https://siec-app.vercel.app/api/simulacion/1/calcular-insumos"
payload = json.dumps({
    "area_bruta_m2": 15,
    "recintos": [
        {"tipo": "Habitación", "ancho": 3, "largo": 5, "piso": 1}
    ]
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        items = data.get("desglose", [])
        print("Primeros 10 insumos devueltos por la API de producción:")
        for i in items[:10]:
            print(f"[{i.get('insumo')}] Tienda: {i.get('tienda')} | URL: {i.get('url_producto')}")
except Exception as e:
    print(f"Error calling API: {e}")
