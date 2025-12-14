from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    remaining_quantity = Column(Integer)
    landing_price = Column(Float)
    date_added = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="batches")
