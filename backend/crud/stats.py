from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
import models

def get_sales_history(db: Session, days: int = 30):
    """
    Get daily revenue and net profit for the last N days.
    """
    start_date = datetime.utcnow().date() - timedelta(days=days)
    reports = db.query(models.DailyReport).filter(models.DailyReport.date >= start_date).order_by(models.DailyReport.date).all()
    
    history = []
    for report in reports:
        # Calculate derived metrics if not stored directly
        revenue = sum(s.selling_price * s.quantity for s in report.sales)
        cogs = sum(s.calculated_cogs for s in report.sales)
        expenses_records = db.query(models.Expense).filter(models.Expense.date == report.date).all()
        day_expenses = sum(e.amount for e in expenses_records)
        
        net_profit = (revenue - cogs) - report.total_ad_spend - day_expenses
        
        history.append({
            "date": report.date,
            "revenue": revenue,
            "net_profit": net_profit
        })
    return history

def get_product_sales_stats(db: Session):
    """
    Get total sales volume per product.
    """
    from sqlalchemy import func
    # Group by product name
    stats = db.query(
        models.Product.name,
        func.sum(models.Sale.selling_price * models.Sale.quantity).label("total_sales")
    ).join(models.Sale, models.Product.id == models.Sale.product_id)\
     .group_by(models.Product.name)\
     .order_by(desc("total_sales"))\
     .limit(10)\
     .all()
     
    return [{"name": name, "value": float(value)} for name, value in stats]
