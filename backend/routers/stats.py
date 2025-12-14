from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date
import models
import crud
import schemas
from dependencies import get_db

router = APIRouter()

@router.get("/expenses-liability")
def read_expenses_liability(db: Session = Depends(get_db)):
    return crud.get_expense_liability_summary(db)

@router.get("/top-payers")
def read_top_payers(limit: int = 5, db: Session = Depends(get_db)):
    return crud.get_top_expense_payers(db, limit=limit)

@router.get("/dashboard")
def get_dashboard_stats(date: Optional[date] = None, db: Session = Depends(get_db)):
    if date:
        # Daily Stats
        # 1. Get Expenses
        expenses = db.query(models.Expense).filter(models.Expense.date == date).all()
        total_expenses = sum(e.amount for e in expenses)

        # 2. Get Report (Sales & Ads)
        report = crud.get_daily_report(db, date)
        
        if report:
            total_revenue = sum(s.selling_price * s.quantity for s in report.sales)
            total_cogs = sum(s.calculated_cogs for s in report.sales)
            gross_profit = total_revenue - total_cogs
            ad_spend = report.total_ad_spend
        else:
            total_revenue = 0.0
            total_cogs = 0.0
            gross_profit = 0.0
            ad_spend = 0.0
    else:
        # Lifetime Stats
        # 1. All Expenses
        # (Could be optimized with SQL func.sum but Python sum is fine for MVP scale)
        expenses_total = db.query(func.sum(models.Expense.amount)).scalar() or 0.0
        total_expenses = expenses_total

        # 2. All Sales (Revenue & COGS)
        sales_stats = db.query(
            func.sum(models.Sale.selling_price * models.Sale.quantity),
            func.sum(models.Sale.calculated_cogs)
        ).first()
        
        total_revenue = sales_stats[0] or 0.0
        total_cogs = sales_stats[1] or 0.0
        gross_profit = total_revenue - total_cogs

        # 3. All Ad Spend (from Daily Reports)
        ad_spend = db.query(func.sum(models.DailyReport.total_ad_spend)).scalar() or 0.0

    # 3. Calculate Net Profit (Common logic)
    net_profit = gross_profit - ad_spend - total_expenses
    
    return {
        "date": date,
        "revenue": total_revenue,
        "cogs": total_cogs,
        "ad_spend": ad_spend,
        "gross_profit": gross_profit,
        "expenses": total_expenses,
        "net_profit": net_profit
    }

@router.get("/history")
def get_history(days: int = 30, db: Session = Depends(get_db)):
    return crud.get_sales_history(db, days)

@router.get("/product-performance")
def get_product_stats(db: Session = Depends(get_db)):
    return crud.get_product_sales_stats(db)

@router.get("/owner-profits")
def get_owner_profits(db: Session = Depends(get_db)):
    return crud.get_owner_profit_breakdown(db)
