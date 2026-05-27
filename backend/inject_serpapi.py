import json
import psycopg2
from datetime import datetime

remote_db = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

def main():
    print("Cargando resultados cacheados de SerpAPI...")
    with open("serpapi_results.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Se encontraron {len(data)} insumos. Conectando a Supabase...")
    try:
        conn = psycopg2.connect(remote_db)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            insertadas = 0
            fecha_hoy = datetime.now().date()
            for item in data:
                if item.get("exitoso") and item.get("precio"):
                    # Delete old prices for today to avoid duplicates
                    cur.execute("""
                        DELETE FROM precio_mercado 
                        WHERE "Insumo_ID" = %s AND "Fecha_Scraping" = %s
                    """, (item["insumo_id"], fecha_hoy))
                    
                    # Insert the new cached price
                    cur.execute("""
                        INSERT INTO precio_mercado 
                        ("Insumo_ID", "Tienda", "Nombre_Producto", "Precio", "Precio_Descuento", "Stock", "Categoria", "URL", "Fecha_Scraping", "Exitoso")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        item["insumo_id"],
                        item["tienda"],
                        item["nombre_producto"],
                        item["precio"],
                        item.get("precio_descuento"),
                        item.get("stock", "Disponible"),
                        item.get("categoria", "Obra Gruesa"),
                        item.get("url", ""),
                        fecha_hoy,
                        True
                    ))
                    insertadas += 1
            print(f"¡Éxito! Se insertaron {insertadas} links de SerpAPI en Producción.")
            print("Cero solicitudes gastadas en esta ejecución.")
    except Exception as e:
        print(f"Error insertando en BD: {e}")

if __name__ == "__main__":
    main()
