from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from database import Base

class Owner(Base):
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    equity_percentage = Column(Float) # Keeping as default/global fallback

    ledger_entries = relationship("OwnerLedger", back_populates="owner")
    product_equities = relationship("ProductEquity", back_populates="owner")
