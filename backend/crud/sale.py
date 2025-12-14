from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException
import models
import schemas
from .product import get_product

def process_sale_fifo(db: Session, sale: schemas.SaleCreate):
    """
    Process a sale using FIFO logic to calculate COGS.
    Deducts stock from oldest batches first.
    """
    product = get_product(db, sale.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.current_stock < sale.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Get batches with remaining quantity > 0, ordered by date
    batches = db.query(models.InventoryBatch).filter(
        models.InventoryBatch.product_id == sale.product_id,
        models.InventoryBatch.remaining_quantity > 0
    ).order_by(asc(models.InventoryBatch.date_added)).all()

    quantity_to_fulfill = sale.quantity
    
    # AVCO COGS Calculation: Use the stored Weighted Average Cost
    # This ensures consistent cost basis regardless of which specific batch is physically depleted
    unit_cogs = product.cost_price 
    total_cogs = round(unit_cogs * sale.quantity, 2)
    
    # Deplete physical stock from batches using FIFO (for tracking remaining batch quantities)
    for batch in batches:
        if quantity_to_fulfill <= 0:
            break
            
        if batch.remaining_quantity >= quantity_to_fulfill:
            # Fully fulfill from this batch
            batch.remaining_quantity -= quantity_to_fulfill
            quantity_to_fulfill = 0
        else:
            # Partially fulfill from this batch and move to next
            take_qty = batch.remaining_quantity
            quantity_to_fulfill -= take_qty
            batch.remaining_quantity = 0 # Depleted this batch
            
    # Update Product Total Stock
    product.current_stock -= sale.quantity

    # Create Sale Record
    db_sale = models.Sale(
        report_id=sale.report_id,
        product_id=sale.product_id,
        quantity=sale.quantity,
        selling_price=sale.selling_price,
        calculated_cogs=total_cogs
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale
