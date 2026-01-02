import os
import sys
from pathlib import Path

# Add backend directory to sys.path
# Since this script is in backend/, we need to make sure imports work
backend_dir = Path(__file__).resolve().parent
from .database import SessionLocal, engine
from .models import Session
from sqlalchemy import text

def test_connection():
    try:
        print("Testing DB Connection...")
        db = SessionLocal()
        # Test 1: Simple SELECT 1
        db.execute(text("SELECT 1"))
        print("SELECT 1: Success")

        # Test 2: Query Session table
        print("Querying Session table...")
        session_id = "0ba3ad4e-7fbe-417c-ba58-3f6b7db423dd"
        s = db.query(Session).filter(Session.id == session_id).first()
        print(f"Session Query Result: {s}")
        
        if s:
            print(f"Status: {s.status}")
            # Access relationships to trigger loading
            print(f"Meal Plan: {s.meal_plan}")
            print(f"Shopping List: {s.shopping_list}")
        
        db.close()
        print("Test Complete: Success")
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
