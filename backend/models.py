from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # sessions = relationship("Session", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    image_paths = Column(JSON, default=list)  # List of image file paths
    detected_ingredients = Column(JSON, nullable=True) # List of detected ingredients
    status = Column(String, default="created") # created, uploaded, analyzing, ingredients_ready, done

    # user_id is optional for now (no login required)
    # user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    
    meal_plan = relationship("GeneratedPlan", back_populates="session", uselist=False)
    shopping_list = relationship("ShoppingList", back_populates="session", uselist=False)

class GeneratedPlan(Base):
    __tablename__ = "generated_plans"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    content = Column(JSON)  # The generated meal plan structure
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="meal_plan")

class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    content = Column(JSON)  # The generated shopping list structure
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="shopping_list")
