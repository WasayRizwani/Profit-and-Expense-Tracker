from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import crud
import schemas
from routers import auth, products, inventory, reports, sales, expenses, owners, stats
import os

# Initialize Tables
models.Base.metadata.create_all(bind=engine)

# Auto-migration for schema updates (Hack for dev environment)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url VARCHAR"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_id INTEGER REFERENCES owners(id)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR UNIQUE, hashed_password VARCHAR)"))
        conn.commit()
    except Exception as e:
        print(f"Migration check failed (safe if column exists): {e}")

# Run Backfill and Seeding
try:
    db = SessionLocal()
    crud.backfill_expense_owners(db)
    
    # Seed Users
    users_to_seed = [
        ("wasayrizwani@gmail.com", "wasay123"),
        ("waqasarshad@gmail.com", "waqas123")
    ]
    for email, pwd in users_to_seed:
        user = crud.get_user_by_email(db, email)
        if not user:
            crud.create_user(db, schemas.UserCreate(email=email, password=pwd))
            print(f"Seeded user: {email}")
            
finally:
    db.close()

app = FastAPI(title="TikTrack API")

# CORS Config
input_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    input_origins.extend([origin.strip() for origin in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=input_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(sales.router, prefix="/sales", tags=["sales"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(owners.router, prefix="/owners", tags=["owners"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TikTrack API"}

@app.get("/health")
def health_check():
    try:
        # We need a new session since it's not injected
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        # raise HTTPException(status_code=503, detail=f"Database connection failed: {e}")
        # Return 503 manually or via HTTPException
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database connection failed: {e}")
