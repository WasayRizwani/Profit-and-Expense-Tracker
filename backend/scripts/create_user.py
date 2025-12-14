
import sys
import os
import argparse

# Add the parent directory (backend) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import crud
import schemas

def create_user(email, password):
    db = SessionLocal()
    try:
        user = crud.get_user_by_email(db, email=email)
        if user:
            print(f"User with email {email} already exists.")
            return

        user_in = schemas.UserCreate(email=email, password=password)
        crud.create_user(db, user=user_in)
        print(f"User {email} created successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new user")
    parser.add_argument("email", type=str, help="User email")
    parser.add_argument("password", type=str, help="User password")
    
    args = parser.parse_args()
    
    create_user(args.email, args.password)
