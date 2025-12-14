from pydantic import BaseModel
from typing import Optional

class SaleBase(BaseModel):
    product_id: int
    quantity: int
    selling_price: float

class SaleCreate(SaleBase):
    report_id: int

class Sale(SaleBase):
    id: int
    calculated_cogs: float

    class Config:
        from_attributes = True

class SaleUpdate(BaseModel):
    id: Optional[int] = None
    product_id: int
    quantity: int
    selling_price: float
