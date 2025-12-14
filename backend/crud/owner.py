from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from fastapi import HTTPException
from datetime import datetime
import models
import schemas

def create_owner(db: Session, owner: schemas.OwnerCreate):
    db_owner = models.Owner(**owner.dict())
    db.add(db_owner)
    db.commit()
    db.refresh(db_owner)
    return db_owner

def set_product_equity(db: Session, owner_id: int, equity_data: schemas.ProductEquityCreate):
    # Check if exists
    existing = db.query(models.ProductEquity).filter(
        models.ProductEquity.owner_id == owner_id,
        models.ProductEquity.product_id == equity_data.product_id
    ).first()
    
    if existing:
        existing.equity_percentage = equity_data.equity_percentage
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_equity = models.ProductEquity(
            owner_id=owner_id,
            product_id=equity_data.product_id,
            equity_percentage=equity_data.equity_percentage
        )
        db.add(new_equity)
        db.commit()
        db.refresh(new_equity)
        return new_equity

def distribute_daily_profit(db: Session, report_id: int):
    """
    Calculates Net Profit distribution considering Product Equity.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # --- 1. Gather Financials ---
    
    # Financials per product
    product_financials = {} # {product_id: {'revenue': 0, 'cogs': 0, 'expenses': 0}}
    
    # A. From Sales
    for sale in report.sales:
        pid = sale.product_id
        if pid not in product_financials: product_financials[pid] = {'revenue': 0, 'cogs': 0, 'expenses': 0}
        product_financials[pid]['revenue'] += (sale.selling_price * sale.quantity)
        product_financials[pid]['cogs'] += sale.calculated_cogs

    # B. From Expenses (Product Specific)
    global_expenses = 0.0
    day_expenses = db.query(models.Expense).filter(models.Expense.date == report.date).all()
    for exp in day_expenses:
        if exp.product_id:
            pid = exp.product_id
            if pid not in product_financials: product_financials[pid] = {'revenue': 0, 'cogs': 0, 'expenses': 0}
            product_financials[pid]['expenses'] += exp.amount
        else:
            global_expenses += exp.amount
            
    # C. Global Ad Spend (from Report)
    global_ad_spend = report.total_ad_spend
    
    total_global_costs = global_expenses + global_ad_spend

    # --- 2. Calculate Distributions ---
    
    owners = db.query(models.Owner).all()
    owner_payouts = {o.id: 0.0 for o in owners}
    
    # A. Distribute Product Profits
    for pid, fins in product_financials.items():
        product_net = fins['revenue'] - fins['cogs'] - fins['expenses']
        
        # Get Equity Map for this product
        equities = db.query(models.ProductEquity).filter(models.ProductEquity.product_id == pid).all()
        
        if not equities:
            # Fallback to global equity if no specific map? 
            # Or treat as unassigned? Let's fallback to global.
            curr_owners = owners
            for owner in curr_owners:
                 share = (owner.equity_percentage / 100.0) * product_net
                 owner_payouts[owner.id] += round(share, 2)
        else:
            # Distributed based on defined equities
            for eq in equities:
                share = (eq.equity_percentage / 100.0) * product_net
                if eq.owner_id in owner_payouts:
                    owner_payouts[eq.owner_id] += round(share, 2)

    # B. Distribute Global Costs (Negative Payout)
    for owner in owners:
        share_cost = (owner.equity_percentage / 100.0) * total_global_costs
        owner_payouts[owner.id] -= round(share_cost, 2)

    # --- 3. Write to Ledger ---
    ledger_entries = []
    
    for owner_id, amount in owner_payouts.items():
        if amount != 0:
            entry = models.OwnerLedger(
                owner_id=owner_id,
                amount=amount,
                transaction_type="PROFIT_SHARE",
                date=datetime.utcnow() 
            )
            db.add(entry)
            ledger_entries.append(entry)
            
    db.commit()
    return ledger_entries

def withdraw_equity(db: Session, owner_id: int, amount: float):
    entry = models.OwnerLedger(
        owner_id=owner_id,
        amount=-amount,
        transaction_type="WITHDRAWAL",
        date=datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def get_owner_balance(db: Session, owner_id: int):
    entries = db.query(models.OwnerLedger).filter(models.OwnerLedger.owner_id == owner_id).all()
    return sum(e.amount for e in entries)

def create_owner_payment(db: Session, payment: schemas.OwnerPaymentCreate):
    db_payment = models.OwnerLedger(
        owner_id=payment.owner_id,
        amount=payment.amount,
        transaction_type="PAYOUT",
        date=payment.date
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_owner_payments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.OwnerLedger)\
             .filter(models.OwnerLedger.transaction_type == "PAYOUT")\
             .options(joinedload(models.OwnerLedger.owner))\
             .order_by(desc(models.OwnerLedger.date))\
             .offset(skip)\
             .limit(limit)\
             .all()

def get_owner_profit_breakdown(db: Session):
    """
    Calculates lifetime profit breakdown for each owner.
    """
    # 1. Fetch Key Data
    owners = db.query(models.Owner).all()
    products = db.query(models.Product).options(joinedload(models.Product.equities)).all()
    
    # 2. Aggregates
    # Global Ad Spend
    total_ad_spend = db.query(func.sum(models.DailyReport.total_ad_spend)).scalar() or 0.0
    
    # Expenses (Global vs Product)
    expenses = db.query(models.Expense).all()
    global_expenses = 0.0
    product_expenses = {} # {product_id: amount}
    
    for exp in expenses:
        if exp.product_id:
            product_expenses[exp.product_id] = product_expenses.get(exp.product_id, 0.0) + exp.amount
        else:
            global_expenses += exp.amount
            
    # Sales (Revenue & COGS) per product
    sales_stats = db.query(
        models.Sale.product_id,
        func.sum(models.Sale.selling_price * models.Sale.quantity).label('revenue'),
        func.sum(models.Sale.calculated_cogs).label('cogs')
    ).group_by(models.Sale.product_id).all()
    
    product_financials = {} # {product_id: {'revenue': 0, 'cogs': 0}}
    for stat in sales_stats:
        product_financials[stat.product_id] = {
            'revenue': stat.revenue or 0.0,
            'cogs': stat.cogs or 0.0
        }

    # 3. Calculation
    owner_data = {o.id: {'name': o.name, 'total': 0.0, 'breakdown': {}} for o in owners}
    
    # A. Distribute Product Profits
    for product in products:
        pid = product.id
        fin = product_financials.get(pid, {'revenue': 0.0, 'cogs': 0.0})
        p_expense = product_expenses.get(pid, 0.0)
        
        product_net = fin['revenue'] - fin['cogs'] - p_expense
        
        equities = product.equities
        
        if equities:
            for eq in equities:
                share = (eq.equity_percentage / 100.0) * product_net
                share = round(share, 2)
                if eq.owner_id in owner_data:
                    owner_data[eq.owner_id]['total'] += share
                    owner_data[eq.owner_id]['breakdown'][product.name] = share
        else:
            # Fallback to Global Equity
            for owner in owners:
                share = (owner.equity_percentage / 100.0) * product_net
                share = round(share, 2)
                owner_data[owner.id]['total'] += share
                owner_data[owner.id]['breakdown'][product.name] = share

    # B. Distribute Global Costs (Negative Payout)
    total_global_costs = total_ad_spend + global_expenses
    for owner in owners:
        cost_share = (owner.equity_percentage / 100.0) * total_global_costs
        cost_share = round(cost_share, 2)
        owner_data[owner.id]['total'] -= cost_share
        
        # Add a "Global Costs" entry to breakdown
        owner_data[owner.id]['breakdown']['Global Costs (Ads & Expenses)'] = -cost_share

    # Format Output
    result = []
    for owner_id, data in owner_data.items():
        # Calculate Total Paid from Ledger
        paid = db.query(func.sum(models.OwnerLedger.amount))\
                 .filter(models.OwnerLedger.owner_id == owner_id, models.OwnerLedger.transaction_type == "PAYOUT")\
                 .scalar() or 0.0
        
        data['total_paid'] = round(paid, 2)
        data['balance'] = round(data['total'] - paid, 2)
        
        # Convert breakdown dict to list
        # Sort breakdown by value desc
        breakdown_list = sorted(
            [{'name': k, 'amount': v} for k, v in data['breakdown'].items()],
            key=lambda x: x['amount'],
            reverse=True
        )
        result.append({
            "id": owner_id,
            "name": data['name'],
            "total_profit": round(data['total'], 2),
            "total_paid": data['total_paid'],
            "balance": data['balance'],
            "breakdown": breakdown_list
        })
        
    return sorted(result, key=lambda x: x['total_profit'], reverse=True)
