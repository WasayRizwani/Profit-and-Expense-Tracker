from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException
import models
import schemas
from .product import get_product
from .sale import process_sale_fifo

def create_daily_report(db: Session, report: schemas.DailyReportCreate):
    # Check if exists first to avoid IntegrityError (Race condition possible but less likely single user)
    existing = db.query(models.DailyReport).filter(models.DailyReport.date == report.date).first()
    if existing:
        return existing
    
    try:
        db_report = models.DailyReport(**report.dict())
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report
    except Exception as e:
        db.rollback()
        # Retry get in case another request created it
        existing = db.query(models.DailyReport).filter(models.DailyReport.date == report.date).first()
        if existing:
            return existing
        raise e

def get_daily_report(db: Session, date):
    return db.query(models.DailyReport).filter(models.DailyReport.date == date).first()

def update_daily_report(db: Session, report_id: int, report_update: schemas.DailyReportUpdate):
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # 1. Update Ad Spend
    report.total_ad_spend = report_update.total_ad_spend
    
    # 2. Sync Sales
    # Create maps for easy access
    existing_sales = {s.id: s for s in report.sales}
    incoming_sales_ids = {s.id for s in report_update.sales if s.id is not None}
    
    # A. Delete missing sales
    for sale_id, sale in existing_sales.items():
        if sale_id not in incoming_sales_ids:
            # Revert stock
            product = get_product(db, sale.product_id)
            if product:
                product.current_stock += sale.quantity
            db.delete(sale)
            
    # B. Process incoming sales (Update or Add)
    for sale_data in report_update.sales:
        if sale_data.id and sale_data.id in existing_sales:
            # Update Existing Sale
            existing_sale = existing_sales[sale_data.id]
            
            # Check if product changed (treat as delete + create)
            if existing_sale.product_id != sale_data.product_id:
                # Revert old
                old_prod = get_product(db, existing_sale.product_id)
                if old_prod:
                    old_prod.current_stock += existing_sale.quantity
                
                # Create new (deducts stock)
                # We need to manually do what process_sale_fifo does but attached to this sale object?
                # Easier to delete the old object and call process_sale_fifo for the new one?
                # But we want to keep the ID if possible? No, if product changes, it's effectively a new line item.
                # Actually, simplest to delete and create new if product changes.
                db.delete(existing_sale)
                
                # Create new
                new_sale_create = schemas.SaleCreate(
                    report_id=report.id, 
                    product_id=sale_data.product_id, 
                    quantity=sale_data.quantity, 
                    selling_price=sale_data.selling_price
                )
                process_sale_fifo(db, new_sale_create)
                
            else:
                # Same Product, check Quantity
                qty_diff = sale_data.quantity - existing_sale.quantity
                product = get_product(db, sale_data.product_id)
                if not product: continue # Should handle error

                if qty_diff > 0:
                    # Sold more: Deduct stock & Add cost
                    # We need a mini-FIFO logic here for the diff
                    # This is complex to extract from process_sale_fifo. 
                    # Let's reuse process_sale_fifo logic basically.
                    
                    if product.current_stock < qty_diff:
                        raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product.name}")
                    
                    # Calculate cost for the extra items
                    batches = db.query(models.InventoryBatch).filter(
                        models.InventoryBatch.product_id == sale_data.product_id,
                        models.InventoryBatch.remaining_quantity > 0
                    ).order_by(asc(models.InventoryBatch.date_added)).all()
                    
                    to_fulfill = qty_diff
                    added_cost = 0.0
                    for batch in batches:
                        if to_fulfill <= 0: break
                        if batch.remaining_quantity >= to_fulfill:
                            added_cost += to_fulfill * batch.landing_price
                            batch.remaining_quantity -= to_fulfill
                            to_fulfill = 0
                        else:
                            take = batch.remaining_quantity
                            added_cost += take * batch.landing_price
                            to_fulfill -= take
                            batch.remaining_quantity = 0
                    
                    product.current_stock -= qty_diff
                    existing_sale.calculated_cogs += added_cost
                    
                elif qty_diff < 0:
                    # Sold less: Return stock & Reduce cost
                    return_qty = abs(qty_diff)
                    product.current_stock += return_qty
                    # Cost reduction: proportional
                    if existing_sale.quantity > 0:
                        unit_cogs = existing_sale.calculated_cogs / existing_sale.quantity
                        existing_sale.calculated_cogs -= (unit_cogs * return_qty)
                    else:
                        existing_sale.calculated_cogs = 0
                
                # Update fields
                existing_sale.quantity = sale_data.quantity
                existing_sale.selling_price = sale_data.selling_price

        else:
            # Add New Sale
            new_sale_create = schemas.SaleCreate(
                report_id=report.id, 
                product_id=sale_data.product_id, 
                quantity=sale_data.quantity, 
                selling_price=sale_data.selling_price
            )
            process_sale_fifo(db, new_sale_create)

    db.commit()
    db.refresh(report)
    return report
