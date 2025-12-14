from langchain.tools import tool
from database import SessionLocal
import crud
from datetime import date, timedelta

# Helper to get session
def get_db_session():
    return SessionLocal()

@tool
def get_recent_sales_stats(days: int = 30):
    """
    Get the daily revenue, cogs, and net profit for the last N days.
    Useful for answering questions about recent performance trends.
    """
    db = get_db_session()
    try:
        data = crud.get_sales_history(db, days)
        # Convert objects/dicts to a more string-friendly format if needed
        # But LangChain handles list of dicts reasonably well
        return data
    finally:
        db.close()

@tool
def get_product_performance():
    """
    Get the total sales volume for top products.
    Useful for identifying best selling items.
    """
    db = get_db_session()
    try:
        return crud.get_product_sales_stats(db)
    finally:
        db.close()

@tool
def get_owner_balances():
    """
    Get the current balance (money owed/due) for each owner/shareholder.
    """
    db = get_db_session()
    try:
        return crud.get_owner_profit_breakdown(db)
    finally:
        db.close()

@tool
def get_top_expenses():
    """
    Get a list of who pays the most expenses.
    """
    db = get_db_session()
    try:
        return crud.get_top_expense_payers(db)
    finally:
        db.close()

@tool
def get_liability_summary():
    """
    Get the summary of expense liabilities (who owes what for expenses).
    """
    db = get_db_session()
    try:
        return crud.get_expense_liability_summary(db)
    finally:
        db.close()

@tool
def get_low_stock_items(threshold: int = 10):
    """
    Get a list of products that have stock below a certain threshold.
    Useful for checking what needs to be reordered.
    """
    db = get_db_session()
    try:
        # We fetch all products and filter in python for now as get_products is paginated but we want to check potentially all
        # For efficiency in a real app we'd add a DB filter. Here we just check the first 100 which is likely all for this MVP.
        products = crud.get_products(db, limit=100) 
        low_stock = []
        for p in products:
            if p.current_stock < threshold:
                low_stock.append({
                    "name": p.name,
                    "sku": p.sku,
                    "current_stock": p.current_stock,
                    "threshold": threshold
                })
        return low_stock
    finally:
        db.close()

@tool
def search_product_inventory(query: str):
    """
    Search for a specific product by name or SKU to check its inventory status.
    """
    db = get_db_session()
    try:
        # Re-using get_products and filtering. 
        # Ideally we'd have a search crud, but this works for MVP.
        products = crud.get_products(db, limit=100)
        matches = []
        for p in products:
            if query.lower() in p.name.lower() or query.lower() in (p.sku or "").lower():
                matches.append({
                    "name": p.name,
                    "sku": p.sku,
                    "current_stock": p.current_stock,
                    "price": p.price
                })
        return matches
    finally:
        db.close()

@tool
def get_daily_report_details(target_date: str):
    """
    Get detailed financial breakdown for a specific date (YYYY-MM-DD).
    Includes specific sales, expenses, and ad spend for that day.
    Useful for investigating why a specific day performed well or poorly.
    """
    db = get_db_session()
    try:
        # Parse date string to object
        try:
             d = date.fromisoformat(target_date)
        except ValueError:
             return "Invalid date format. Please use YYYY-MM-DD."

        report = crud.get_daily_report(db, d)
        
        # Expenses for this day
        expenses = db.query(models.Expense).filter(models.Expense.date == d).all()
        expense_list = [{"category": e.category, "amount": e.amount, "desc": e.description} for e in expenses]
        
        if not report:
            if not expenses:
                return f"No data found for {target_date}."
            return {
                "date": str(d),
                "status": "No Daily Report (Sales/Ads) filed.",
                "expenses": expense_list,
                "total_expenses": sum(e['amount'] for e in expense_list)
            }

        # Sales details
        sales_data = []
        for s in report.sales:
            # We need product names, easiest to fetch products or trust the relation if loaded
            # models.Sale doesn't have product relation loaded by default in some crud, but let's try
            # If lazy loading is on it might work, otherwise we might just get IDs.
            # For robustness, let's just return what we have.
            sales_data.append({
                 "product_id": s.product_id,
                 "qty": s.quantity,
                 "price": s.selling_price,
                 "cogs": s.calculated_cogs
            })

        return {
            "date": str(d),
            "ad_spend": report.total_ad_spend,
            "sales_count": len(sales_data),
            "sales_breakdown": sales_data,
            "expenses": expense_list,
            "net_profit": "Calculate this from (Revenue - COGS - Ad Spend - Expenses)" 
        }
    finally:
        db.close()

@tool
def search_expenses(query: str):
    """
    Search for expenses by description or category. 
    Useful for finding specific costs like 'server', 'lunch', 'shipping'.
    """
    db = get_db_session()
    try:
        # Simple SQL like
        # We need to import models inside tools if not available globally safely or use crud
        expenses = db.query(models.Expense).filter(
            (models.Expense.description.ilike(f"%{query}%")) | 
            (models.Expense.category.ilike(f"%{query}%"))
        ).limit(20).all()
        
        return [
            {"date": str(e.date), "amount": e.amount, "category": e.category, "description": e.description}
            for e in expenses
        ]
    finally:
        db.close()
