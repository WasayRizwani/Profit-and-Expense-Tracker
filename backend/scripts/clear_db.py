import sys
import os

# Add parent directory to path to allow importing backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import Base
import models

def reset_database():
    print("Dropping all tables...", flush=True)
    Base.metadata.drop_all(bind=engine)
    print("Recreating all tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    print("Database cleared successfully.", flush=True)

if __name__ == "__main__":
    reset_database()
