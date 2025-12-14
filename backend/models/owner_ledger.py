from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class OwnerLedger(Base):
    __tablename__ = "owner_ledger"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("owners.id"))
    amount = Column(Float)
    transaction_type = Column(String) # PROFIT_SHARE, WITHDRAWAL
    date = Column(DateTime, default=datetime.utcnow)

    owner = relationship("Owner", back_populates="ledger_entries")
