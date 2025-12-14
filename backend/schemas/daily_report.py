from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from .sale import Sale, SaleUpdate

class DailyReportBase(BaseModel):
    date: date
    total_ad_spend: float
    notes: Optional[str] = None

class DailyReportCreate(DailyReportBase):
    pass

class DailyReportUpdate(BaseModel):
    total_ad_spend: float
    sales: List[SaleUpdate] = []

class DailyReport(DailyReportBase):
    id: int
    sales: List[Sale] = []
    net_profit: Optional[float] = 0.0 # Calculated field

    class Config:
        from_attributes = True
