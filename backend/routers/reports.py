from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from fastapi.responses import StreamingResponse
import io
import models
import crud
import schemas
from dependencies import get_db
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter()

@router.post("/", response_model=schemas.DailyReport)
def create_report(report: schemas.DailyReportCreate, db: Session = Depends(get_db)):
    db_report = crud.get_daily_report(db, date=report.date)
    if db_report:
        raise HTTPException(status_code=400, detail="A report for this date already exists.")
    return crud.create_daily_report(db, report)

@router.get("/", response_model=List[schemas.DailyReport])
def read_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reports = db.query(models.DailyReport).order_by(models.DailyReport.date.desc()).offset(skip).limit(limit).all()
    
    # Calculate Net Profit dynamically for each report
    results = []
    for report in reports:
        revenue = sum(s.selling_price * s.quantity for s in report.sales)
        cogs = sum(s.calculated_cogs for s in report.sales)
        
        # Expenses for this specific date
        expenses_records = db.query(models.Expense).filter(models.Expense.date == report.date).all()
        day_expenses = sum(e.amount for e in expenses_records)
        
        # Net Profit = (Revenue - COGS) - Ad Spend - Daily Expenses
        net_profit = (revenue - cogs) - report.total_ad_spend - day_expenses
        
        # Attach to object (Pydantic will serialize it)
        report.net_profit = round(net_profit, 2)
        results.append(report)
        
    return results

@router.get("/export/pdf")
def export_reports_pdf(start_date: date, end_date: date, db: Session = Depends(get_db)):
    # Fetch reports in range
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.date >= start_date,
        models.DailyReport.date <= end_date
    ).order_by(models.DailyReport.date.desc()).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f"Daily Reports ({start_date} to {end_date})", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Table Data
    data = [["Date", "Revenue", "COGS", "Ad Spend", "Expenses", "Net Profit"]]
    
    total_revenue = 0
    total_net_profit = 0
    
    for report in reports:
        # Calculate calculated fields
        revenue = sum(s.selling_price * s.quantity for s in report.sales)
        cogs = sum(s.calculated_cogs for s in report.sales)
        
        # Get expenses for this day
        expenses_records = db.query(models.Expense).filter(models.Expense.date == report.date).all()
        day_expenses = sum(e.amount for e in expenses_records)
        
        net_profit = (revenue - cogs) - report.total_ad_spend - day_expenses
        
        total_revenue += revenue
        total_net_profit += net_profit
        
        data.append([
            str(report.date),
            f"£{revenue:.2f}",
            f"£{cogs:.2f}",
            f"£{report.total_ad_spend:.2f}",
            f"£{day_expenses:.2f}",
            f"£{net_profit:.2f}"
        ])
    
    # Totals Row
    data.append([
        "TOTAL",
        f"£{total_revenue:.2f}",
        "",
        "",
        "",
        f"£{total_net_profit:.2f}"
    ])
    
    # Table Style
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=reports.pdf"})

@router.get("/{date}", response_model=schemas.DailyReport)
def get_report(date: date, db: Session = Depends(get_db)):
    report = crud.get_daily_report(db, date=date)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.put("/{report_id}", response_model=schemas.DailyReport)
def update_report(report_id: int, report_update: schemas.DailyReportUpdate, db: Session = Depends(get_db)):
    return crud.update_daily_report(db, report_id, report_update)

@router.put("/{report_id}/profit-distribute")
def distribute_profit(report_id: int, db: Session = Depends(get_db)):
    entries = crud.distribute_daily_profit(db, report_id)
    return {"message": "Profit distributed", "entries": len(entries)}
