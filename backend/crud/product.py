from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import func
import models
import schemas
import uuid

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def create_product(db: Session, product: schemas.ProductCreate):
    # Exclude 'equities' from the Product model dump as it's a relationship/separate table
    prod_data = product.dict(exclude={"equities"})
    
    # Generate random SKU if not provided
    if not prod_data.get('sku'):
        # Generate a short random SKU (e.g., first 8 chars of uuid)
        prod_data['sku'] = str(uuid.uuid4())[:8].upper()

    # prod_data now contains cost_price (and price=0.0 which is fine)
    db_product = models.Product(**prod_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Handle Equities if provided
    if product.equities:
        for eq in product.equities:
            # eq is ProductEquityInput (owner_id, equity_percentage)
            new_equity = models.ProductEquity(
                product_id=db_product.id,
                owner_id=eq.owner_id,
                equity_percentage=eq.equity_percentage
            )
            db.add(new_equity)
        db.commit() # Commit all equities
        db.refresh(db_product)

    return db_product

def get_products(db: Session, skip: int = 0, limit: int = 100):
    products = db.query(
        models.Product, 
        func.coalesce(func.sum(models.Sale.quantity), 0).label('total_sold')
    ).outerjoin(models.Sale)\
     .options(
         selectinload(models.Product.equities).joinedload(models.ProductEquity.owner),
         selectinload(models.Product.batches)
     )\
     .group_by(models.Product.id).offset(skip).limit(limit).all()
    
    results = []
    for product, sold in products:
        product.total_sold = sold
        # product.cost_price is now stored and updated on inventory add (AVCO)
        results.append(product)
    return results
