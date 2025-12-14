from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import models
import crud
import schemas
from dependencies import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Owner)
def create_owner(owner: schemas.OwnerCreate, db: Session = Depends(get_db)):
    return crud.create_owner(db=db, owner=owner)

@router.post("/payment")
def create_owner_payment(payment: schemas.OwnerPaymentCreate, db: Session = Depends(get_db)):
    return crud.create_owner_payment(db=db, payment=payment)

@router.get("/payments", response_model=List[schemas.OwnerLedger])
def read_owner_payments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_owner_payments(db, skip=skip, limit=limit)

@router.get("/", response_model=List[schemas.Owner])
def read_owners(db: Session = Depends(get_db)):
    return db.query(models.Owner).all()

@router.post("/{owner_id}/equity", response_model=schemas.ProductEquity)
def set_owner_product_equity(owner_id: int, equity: schemas.ProductEquityCreate, db: Session = Depends(get_db)):
    return crud.set_product_equity(db, owner_id, equity)

@router.get("/{owner_id}/balance")
def get_balance(owner_id: int, db: Session = Depends(get_db)):
    balance = crud.get_owner_balance(db, owner_id)
    return {"owner_id": owner_id, "balance": balance}
