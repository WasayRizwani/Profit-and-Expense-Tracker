from pydantic import BaseModel
from datetime import datetime

class InventoryBatchBase(BaseModel):
    quantity: int
    landing_price: float

class InventoryBatchCreate(InventoryBatchBase):
    product_id: int

class InventoryBatch(InventoryBatchBase):
    id: int
    remaining_quantity: int
    date_added: datetime

    class Config:
        from_attributes = True
