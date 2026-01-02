
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Session, GeneratedPlan
from backend.database import DATABASE_URL

# Setup DB connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("-" * 50)
print("DEBUG: Checking latest sessions...")
print("-" * 50)

# Get last 5 sessions
sessions = db.query(Session).order_by(Session.created_at.desc()).limit(5).all()

for s in sessions:
    print(f"ID: {s.id}")
    print(f"Status: {s.status}")
    print(f"Created: {s.created_at}")
    print(f"Images: {len(s.image_paths) if s.image_paths else 0}")
    print(f"Ingredients: {s.detected_ingredients}")
    print(f"Plan Exists: {s.meal_plan is not None}")
    print("-" * 30)

if not sessions:
    print("No sessions found.")
