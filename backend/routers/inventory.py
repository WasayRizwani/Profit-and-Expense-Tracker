from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import crud
import schemas
from dependencies import get_db

router = APIRouter()

@router.post("/batch", response_model=schemas.InventoryBatch)
def create_inventory_batch(batch: schemas.InventoryBatchCreate, db: Session = Depends(get_db)):
    return crud.create_inventory_batch(db, batch)

@router.post("/", response_model=schemas.InventoryBatch)
def add_inventory(batch: schemas.InventoryBatchCreate, db: Session = Depends(get_db)):
    return crud.add_inventory_batch(db, batch)
