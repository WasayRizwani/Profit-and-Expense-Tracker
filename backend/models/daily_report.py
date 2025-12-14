from sqlalchemy import Column, Integer, Float, Date, Text
from sqlalchemy.orm import relationship
from database import Base

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    total_ad_spend = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

    sales = relationship("Sale", back_populates="report")
