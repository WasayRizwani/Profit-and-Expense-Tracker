from sqlalchemy.orm import Session
import models
import schemas
from .product import get_product

def create_inventory_batch(db: Session, batch: schemas.InventoryBatchCreate):
    # Explicitly initialize remaining_quantity
    data = batch.dict()
    data['remaining_quantity'] = batch.quantity
    db_batch = models.InventoryBatch(**data)
    db.add(db_batch)
    
    # Update Product Stack
    product = get_product(db, batch.product_id)
    if product:
        # Calculate Weighted Average Cost (AVCO)
        current_total_value = product.current_stock * product.cost_price
        new_batch_value = batch.quantity * batch.landing_price
        
        new_total_stock = product.current_stock + batch.quantity
        
        if new_total_stock > 0:
            new_avg_cost = (current_total_value + new_batch_value) / new_total_stock
            product.cost_price = round(new_avg_cost, 2)
            
        product.current_stock = new_total_stock
        
    db.commit()
    db.refresh(db_batch)
    return db_batch

def add_inventory_batch(db: Session, batch: schemas.InventoryBatchCreate):
    # 1. Create Batch
    db_batch = models.InventoryBatch(
        product_id=batch.product_id,
        quantity=batch.quantity,
        remaining_quantity=batch.quantity,
        landing_price=batch.landing_price
    )
    db.add(db_batch)
    
    # 2. Update Product Stock
    product = get_product(db, batch.product_id)
    if product:
        product.current_stock += batch.quantity
    
    db.commit()
    db.refresh(db_batch)
    return db_batch
