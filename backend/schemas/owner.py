from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .product import ProductEquity, ProductEquityInput, ProductEquityBase, OwnerSummary

# Re-exporting these from product if needed, or defining owner specific ones here

class OwnerBase(BaseModel):
    name: str
    equity_percentage: float = 0.0

class OwnerCreate(OwnerBase):
    pass

class Owner(OwnerBase):
    id: int
    product_equities: List[ProductEquity] = []

    class Config:
        from_attributes = True

class OwnerPaymentCreate(BaseModel):
    owner_id: int
    amount: float
    date: datetime = datetime.utcnow()

class OwnerLedgerBase(BaseModel):
    owner_id: int
    amount: float
    transaction_type: str
    date: datetime

class OwnerLedger(OwnerLedgerBase):
    id: int
    owner: Optional[OwnerSummary] = None

    class Config:
        from_attributes = True

class ProductEquityCreate(ProductEquityBase):
    pass
