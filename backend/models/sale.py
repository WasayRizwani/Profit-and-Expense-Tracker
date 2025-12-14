from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    selling_price = Column(Float)
    calculated_cogs = Column(Float) # Stores the cost calculated at time of sale (FIFO)

    report = relationship("DailyReport", back_populates="sales")
    product = relationship("Product", back_populates="sales")
