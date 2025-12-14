from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String, unique=True, index=True)
    price = Column(Float, default=0.0) # Selling Price
    cost_price = Column(Float, default=0.0) # Reference Cost / Default Landing Price
    current_stock = Column(Integer, default=0)
    product_url = Column(String, nullable=True)

    batches = relationship("InventoryBatch", back_populates="product")
    sales = relationship("Sale", back_populates="product")
    equities = relationship("ProductEquity", back_populates="product")
