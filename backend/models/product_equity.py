from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class ProductEquity(Base):
    __tablename__ = "product_equity"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("owners.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    equity_percentage = Column(Float, default=0.0)

    owner = relationship("Owner", back_populates="product_equities")
    product = relationship("Product", back_populates="equities")
