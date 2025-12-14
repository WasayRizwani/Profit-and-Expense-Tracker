from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import crud
import schemas
from dependencies import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Sale)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    return crud.process_sale_fifo(db, sale)
