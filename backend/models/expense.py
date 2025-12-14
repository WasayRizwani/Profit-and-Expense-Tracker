from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    category = Column(String) # Ads, Tools, Editing, etc.
    amount = Column(Float)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    paid_by_id = Column(Integer, ForeignKey("owners.id"), nullable=True)
    description = Column(String)
