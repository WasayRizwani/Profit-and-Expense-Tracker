from pydantic import BaseModel
from typing import List, Optional

# Forward declare to avoid circular import issues if needed in typings
# but here we use string forward ref usually.
class ProductEquityInput(BaseModel):
    owner_id: int
    equity_percentage: float

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    product_url: Optional[str] = None

class ProductCreate(ProductBase):
    price: float = 0.0 # Selling Price (Optional during creation now)
    cost_price: float = 0.0
    equities: List[ProductEquityInput] = []

# We need ProductEquity schema here for the read model
class OwnerSummary(BaseModel):
    name: str
    equity_percentage: float = 0.0
    id: int
    class Config:
        from_attributes = True

class ProductEquityBase(BaseModel):
    product_id: int
    equity_percentage: float

class ProductEquity(ProductEquityBase):
    id: int
    owner_id: int
    owner: Optional[OwnerSummary] = None

    class Config:
        from_attributes = True

class ProductEquityCreate(ProductEquityBase):
    pass

class Product(ProductBase):
    id: int
    price: float
    cost_price: float
    current_stock: int
    product_url: Optional[str] = None
    total_sold: int = 0
    equities: List[ProductEquity] = []

    class Config:
        from_attributes = True
