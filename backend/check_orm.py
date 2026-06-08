import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import PrecioMercado, Base

os.environ["DATABASE_URL"] = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

engine = create_engine(os.environ["DATABASE_URL"])
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

records = db.query(PrecioMercado).filter(PrecioMercado.insumo_id == 1).all()
for r in records:
    print(f"Tienda: {r.tienda} | URL attribute: {r.url}")
