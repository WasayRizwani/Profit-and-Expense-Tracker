from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
import models
import schemas

def create_expense(db: Session, expense: schemas.ExpenseCreate):
    db_expense = models.Expense(**expense.dict())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    db.refresh(db_expense)
    return db_expense

def get_expenses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Expense).order_by(desc(models.Expense.date), desc(models.Expense.id)).offset(skip).limit(limit).all()

def get_top_expense_payers(db: Session, limit: int = 5):
    # Aggregating expenses by paid_by_id
    # We join with Owner to get names
    results = db.query(
        models.Owner.name,
        func.sum(models.Expense.amount).label('total_paid')
    ).join(models.Expense, models.Owner.id == models.Expense.paid_by_id)\
    .group_by(models.Owner.name)\
    .order_by(desc('total_paid'))\
    .limit(limit)\
    .all()
    
    return [{"name": r[0], "amount": r[1]} for r in results]

def backfill_expense_owners(db: Session):
    """
    One-time script to parse 'Paid by Name' from description and update paid_by_id
    """
    expenses = db.query(models.Expense).filter(models.Expense.paid_by_id == None).all()
    owners = db.query(models.Owner).all()
    owner_map = {o.name: o.id for o in owners}
    
    updated_count = 0
    for expense in expenses:
        if "(Paid by " in expense.description:
            try:
                # Extract name: "Desc (Paid by Name)" -> "Name"
                parts = expense.description.split("(Paid by ")
                if len(parts) > 1:
                    name_part = parts[1].strip().rstrip(")")
                    if name_part in owner_map:
                        expense.paid_by_id = owner_map[name_part]
                        updated_count += 1
            except Exception:
                pass
    
    if updated_count > 0:
        db.commit()
        print(f"Backfilled {updated_count} expenses with owner IDs.")

def get_expense_liability_summary(db: Session):
    """
    Calculates estimated expense liability for each user.
    """
    expenses = db.query(models.Expense).all()
    owners = db.query(models.Owner).all()
    
    # Initialize liability map
    liability = {owner.id: 0.0 for owner in owners}
    owner_names = {owner.id: owner.name for owner in owners}
    global_equity = {owner.id: (owner.equity_percentage or 0.0) / 100.0 for owner in owners}
    
    # Helper to get product equity
    # We'll cache product equities to avoid N+1
    products = db.query(models.Product).options(joinedload(models.Product.equities)).all()
    product_equity_map = {}
    for p in products:
        if p.equities:
            product_equity_map[p.id] = {pe.owner_id: pe.equity_percentage / 100.0 for pe in p.equities}
        else:
            product_equity_map[p.id] = None # Fallback to global
            
    for expense in expenses:
        amount = expense.amount
        
        if expense.product_id and expense.product_id in product_equity_map:
            # Product specific expense
            p_equity = product_equity_map[expense.product_id]
            if p_equity:
                # Distribute based on product equity
                for owner_id, share in p_equity.items():
                    liability[owner_id] += amount * share
                continue
        
        # Fallback: General expense or Product with no specific equity -> Global Equity
        for owner_id, share in global_equity.items():
            liability[owner_id] += amount * share

    # Format result
    result = []
    for owner_id, amount in liability.items():
        result.append({
            "name": owner_names.get(owner_id, "Unknown"),
            "amount": round(amount, 2)
        })
    
    # Sort by amount desc
    result.sort(key=lambda x: x["amount"], reverse=True)
    
    return result
