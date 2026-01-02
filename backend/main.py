from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Smart Meal Manager API")

# CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Smart Meal Manager API is running"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    return {"status": "ok", "db": "connected"}

# --- Session & Upload APIs ---

@app.post("/api/session/{session_id}/images")
async def upload_images(
    session_id: str, 
    files: list[UploadFile] = File(...),
    db: Session = Depends(database.get_db)
):
    # 1. Ensure upload dir exists
    UPLOAD_DIR = "uploads"
    import os
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    saved_paths = []
    for file in files:
        # Use simple timestamp to avoid collisions
        import time
        timestamp = int(time.time() * 1000)
        file_path = f"{UPLOAD_DIR}/{session_id}_{timestamp}_{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        saved_paths.append(file_path)
    
    # 2. Update DB
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not db_session:
        # Create new session
        db_session = models.Session(id=session_id, image_paths=saved_paths, status="uploaded")
        db.add(db_session)
    else:
        # Update existing
        current_paths = db_session.image_paths or []
        db_session.image_paths = current_paths + saved_paths
        db_session.status = "uploaded"
    
    db.commit()
    db.refresh(db_session)
    
    return {"status": "uploaded", "count": len(saved_paths), "paths": saved_paths}

@app.get("/api/session/{session_id}/status")
def get_session_status(session_id: str, db: Session = Depends(database.get_db)):
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not db_session:
        return {"status": "waiting", "image_count": 0}
    
    image_count = len(db_session.image_paths) if db_session.image_paths else 0
    return {
        "status": db_session.status, 
        "image_count": image_count,
        "ingredients": db_session.detected_ingredients,
        "meal_plan": db_session.meal_plan.content if db_session.meal_plan else None,
        "shopping_list": db_session.shopping_list.content if db_session.shopping_list else None
    }

@app.post("/api/session/{session_id}/analyze")
def start_analysis(session_id: str, db: Session = Depends(database.get_db)):
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if not db_session.image_paths:
         raise HTTPException(status_code=400, detail="No images uploaded")

    # Update status
    db_session.status = "analyzing"
    db.commit()
    
    # 1. Detect Ingredients (Sync for now, async better for prod)
    from services.ai_service import detect_ingredients, generate_plan
    from services.scraper_service import get_bargain_items
    
    # Run in background ideally, but for MVP blocking is ok if < 30s
    # Step A: Ingredients
    detection_result = detect_ingredients(db_session.image_paths)
    ingredients = detection_result.get("ingredients", [])
    
    db_session.detected_ingredients = ingredients
    db_session.status = "ingredients_ready"
    db.commit()
    
    # Step B: Bargain Items (Mock)
    bargains = get_bargain_items()
    
    # Step C: Generate Plan
    plan_result = generate_plan(ingredients, bargains)
    
    # Save Results
    generated_plan_data = plan_result.get("meal_plan", [])
    shopping_list_data = plan_result.get("shopping_list", [])
    
    # Save Plan
    new_plan = models.GeneratedPlan(session_id=session_id, content=generated_plan_data)
    db.add(new_plan)
    
    # Save List
    new_list = models.ShoppingList(session_id=session_id, content=shopping_list_data)
    db.add(new_list)
    
    db_session.status = "done"
    db.commit()
    
    return {"status": "done", "ingredients": ingredients}
