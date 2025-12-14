from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
from models import Product, InventoryBatch, DailyReport, Sale, Expense, Owner, OwnerLedger
from schemas import ProductCreate, InventoryBatchCreate, SaleCreate, DailyReportCreate, ExpenseCreate, OwnerCreate
import crud

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_fifo_logic(db):
    # 1. Create Product
    prod = crud.create_product(db, ProductCreate(name="Lipstick", sku="LIP-001"))
    assert prod.id is not None
    assert prod.current_stock == 0

    # 2. Add Batches
    # Batch A: 10 @ $5
    crud.add_inventory_batch(db, InventoryBatchCreate(
        product_id=prod.id, quantity=10, landing_price=5.0
    ))
    # Batch B: 10 @ $7
    crud.add_inventory_batch(db, InventoryBatchCreate(
        product_id=prod.id, quantity=10, landing_price=7.0
    ))

    db.refresh(prod)
    assert prod.current_stock == 20

    # 3. Create Daily Report
    report = crud.create_daily_report(db, DailyReportCreate(
        date=date(2023, 10, 27),
        total_ad_spend=20.0
    ))

    # 4. Sell 5 units (Should be from Batch A @ $5)
    sale1 = crud.process_sale_fifo(db, SaleCreate(
        product_id=prod.id,
        quantity=5,
        selling_price=15.0,
        report_id=report.id
    ))
    
    assert sale1.calculated_cogs == 5 * 5.0  # $25
    
    db.refresh(prod)
    assert prod.current_stock == 15

    # 5. Sell 10 units (5 from Batch A @ $5, 5 from Batch B @ $7)
    # Remaining in A: 5. Remaining in B: 10.
    sale2 = crud.process_sale_fifo(db, SaleCreate(
        product_id=prod.id,
        quantity=10,
        selling_price=15.0,
        report_id=report.id
    ))
    
    # Expected COGS:
    # 5 units @ $5 (Batch A) = $25
    # 5 units @ $7 (Batch B) = $35
    # Total = $60
    assert sale2.calculated_cogs == 25.0 + 35.0
    
    db.refresh(prod)
    assert prod.current_stock == 5

def test_profit_split(db):
    # Setup Owners
    o1 = crud.create_owner(db, OwnerCreate(name="Alice", equity_percentage=50.0))
    o2 = crud.create_owner(db, OwnerCreate(name="Bob", equity_percentage=50.0))

    # We reuse the logic from previous test if DB persists in module scope
    # But let's create a new fresh scenario for clarity or continue
    # Ideally should use function scope fixture, but let's just make a new report/product
    
    prod = crud.create_product(db, ProductCreate(name="Perfume", sku="PERF-001"))
    crud.add_inventory_batch(db, InventoryBatchCreate(
        product_id=prod.id, quantity=10, landing_price=5.0
    ))
    
    report = crud.create_daily_report(db, DailyReportCreate(
        date=date(2023, 11, 1),
        total_ad_spend=20.0
    ))
    
    # Sell 5 units @ $15. COGS = 5 * 5 = $25.
    crud.process_sale_fifo(db, SaleCreate(
        product_id=prod.id, quantity=5, selling_price=15.0, report_id=report.id
    ))
    # Revenue = 75. COGS = 25. Gross = 50.
    
    # Add Expense: $10 Editing
    crud.create_expense(db, ExpenseCreate(
        date=date(2023, 11, 1),
        category="Editing",
        amount=10.0,
        description="Video Edit"
    ))
    
    # Distribute Profit
    # Net = 50 - 20 (Ads) - 10 (Expense) = 20.
    entries = crud.distribute_daily_profit(db, report.id)
    
    # Check Entries
    assert len(entries) == 2
    assert entries[0].amount == 10.0
    assert entries[1].amount == 10.0
    
    # Check Balance
    bal1 = crud.get_owner_balance(db, o1.id)
    assert bal1 == 10.0
