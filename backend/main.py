from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database
from pydantic import BaseModel

try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception as e:
    print(f"Startup DB Error (Ignored): {e}")

app = FastAPI(title="Smart Meal Manager API")

# CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/api/reset")
def reset_all_sessions():
    MOCK_SESSIONS.clear()
    return {"status": "cleared"}

class RecipeSuggestionRequest(BaseModel):
    ingredient: str

@app.post("/api/recipes/suggest")
def suggest_recipes_endpoint(req: RecipeSuggestionRequest):
    try:
        from backend.services.ai_service import suggest_recipes
    except ImportError:
        from services.ai_service import suggest_recipes
    
    recipes = suggest_recipes(req.ingredient)
    return {"recipes": recipes}

import socket
import traceback

@app.get("/api/network-info")
def get_network_info():
    ip = "127.0.0.1"
    try:
        # Connect to an external server (Google DNS) to get the interface IP used for routing
        # This is more reliable than gethostbyname(gethostname()) which might return 127.0.0.1
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        print(f"Network Info: Detected IP {ip}")
    except Exception as e:
        print(f"Network Info Error: {e}")
        traceback.print_exc()
        ip = "127.0.0.1"
    return {"ip": ip, "port": 3000}

@app.post("/api/debug/reset_db")
def debug_reset_db(db: Session = Depends(database.get_db)):
    try:
        models.Base.metadata.drop_all(bind=database.engine)
        models.Base.metadata.create_all(bind=database.engine)
        return {"status": "success", "message": "Database reset complete"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Session & Upload APIs ---

# --- In-Memory Mock Storage (Fallback) ---
MOCK_SESSIONS = {}

@app.post("/api/sessions")
def create_session(db: Session = Depends(database.get_db)):
    import uuid
    session_id = str(uuid.uuid4())
    
    try:
        # Try DB first
        db_session = models.Session(id=session_id, status="waiting")
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        print(f"Created session (DB): {session_id}")
    except Exception as e:
        print(f"DB Error (Fallback to Mock): {e}")
        # Fallback to Mock
        MOCK_SESSIONS[session_id] = {
            "id": session_id,
            "status": "waiting",
            "image_paths": [],
            "detected_ingredients": [],
            "meal_plan": None,
            "shopping_list": None
        }
        print(f"Created session (Mock): {session_id}")
        
    return {"session_id": session_id}

@app.post("/api/session/{session_id}/images")
async def upload_images(
    session_id: str, 
    files: list[UploadFile] = File(...),
    db: Session = Depends(database.get_db)
):
    try:
        # 1. Ensure upload dir exists
        UPLOAD_DIR = "uploads"
        import os
        import time
        import traceback
        
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        saved_paths = []
        for file in files:
            timestamp = int(time.time() * 1000)
            original_name = file.filename or "unknown.jpg"
            safe_name = "".join(c for c in original_name if c.isalnum() or c in "._-")
            if not safe_name: safe_name = "image.jpg"
            file_path = f"{UPLOAD_DIR}/{session_id}_{timestamp}_{safe_name}"
            
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            saved_paths.append(file_path)
            
    except Exception as e:
        print(f"Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server Upload Error: {str(e)}")
    
    # 2. Update DB or Mock
    try:
        db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if db_session:
            current_paths = db_session.image_paths or []
            db_session.image_paths = current_paths + saved_paths
            db_session.status = "uploaded"
            db.commit()
            db.refresh(db_session)
            return {"status": "uploaded", "count": len(saved_paths), "paths": saved_paths}
    except:
        pass
        
    # Mock Fallback
    if session_id in MOCK_SESSIONS:
        MOCK_SESSIONS[session_id]["image_paths"].extend(saved_paths)
        MOCK_SESSIONS[session_id]["status"] = "uploaded"
        return {"status": "uploaded", "count": len(saved_paths), "paths": saved_paths}

    # If neither found
    if not (session_id in MOCK_SESSIONS):
         # Create impromptu mock if upload comes in (edge case)
         MOCK_SESSIONS[session_id] = {
            "id": session_id,
            "status": "uploaded",
            "image_paths": saved_paths,
            "detected_ingredients": [],
            "meal_plan": None,
            "shopping_list": None
        }
         return {"status": "uploaded", "count": len(saved_paths), "paths": saved_paths}
         
    return {"status": "error", "message": "Session not found"}

@app.get("/api/session/{session_id}/status")
def get_session_status(session_id: str, db: Session = Depends(database.get_db)):
    # Try DB
    try:
        db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if db_session:
            image_count = len(db_session.image_paths) if db_session.image_paths else 0
            return {
                "status": db_session.status, 
                "image_count": image_count,
                "ingredients": db_session.detected_ingredients,
                "meal_plan": db_session.meal_plan.content if db_session.meal_plan else None,
                "shopping_list": db_session.shopping_list.content if db_session.shopping_list else None
            }
    except:
        pass
        
    # Try Mock
    if session_id in MOCK_SESSIONS:
        s = MOCK_SESSIONS[session_id]
        return {
            "status": s["status"],
            "image_count": len(s["image_paths"]),
            "ingredients": s["detected_ingredients"],
            "meal_plan": s["meal_plan"],
            "shopping_list": s["shopping_list"]
        }

    return {"status": "waiting", "image_count": 0}

@app.post("/api/session/{session_id}/analyze")
def start_analysis(session_id: str, db: Session = Depends(database.get_db)):
    # DB logic...
    db_session = None
    try:
        db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if db_session:
             if not db_session.image_paths: raise HTTPException(status_code=400, detail="No images")
             db_session.status = "analyzing"
             db.commit()
    except:
        pass
        
    # Mock Logic check
    mock_session = MOCK_SESSIONS.get(session_id)
    if not db_session and not mock_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if mock_session:
        if not mock_session["image_paths"]: raise HTTPException(status_code=400, detail="No images")
        mock_session["status"] = "analyzing"
    
    try:
        # 1. Detect Ingredients (Sync for now, async better for prod)
        try:
            from backend.services.ai_service import detect_ingredients, generate_plan
            from backend.services.scraper_service import get_bargain_items
        except ImportError:
             # Fallback if running from within backend dir
             from services.ai_service import detect_ingredients, generate_plan
             from services.scraper_service import get_bargain_items
        
        # Run in background ideally, but for MVP blocking is ok if < 30s
        # Step A: Ingredients
        # Determine paths to use (DB or Mock)
        image_paths = []
        if db_session:
            image_paths = db_session.image_paths
        elif mock_session:
            image_paths = mock_session["image_paths"]
            
        print(f"Starting detection for session {session_id} with paths: {image_paths}")
        detection_result = detect_ingredients(image_paths)
        ingredients = detection_result.get("ingredients", [])
        
        # Save Ingredients
        if db_session:
            db_session.detected_ingredients = ingredients
            db_session.status = "ingredients_ready"
            db.commit()
        if mock_session:
            mock_session["detected_ingredients"] = ingredients
            mock_session["status"] = "ingredients_ready"
        
        # Step B: Bargain Items (Mock)
        bargains = get_bargain_items()
        
        # Step C: Generate Plan
        print(f"Starting planning for session {session_id}")
        plan_result = generate_plan(ingredients, bargains)
        
        # Save Results
        generated_plan_data = plan_result.get("meal_plan", [])
        shopping_list_data = plan_result.get("shopping_list", [])
        
        # Save Plan & List (DB)
        if db_session:
            new_plan = models.GeneratedPlan(session_id=session_id, content=generated_plan_data)
            db.add(new_plan)
            
            new_list = models.ShoppingList(session_id=session_id, content=shopping_list_data)
            db.add(new_list)
            
            db_session.status = "done"
            db.commit()
            
        # Save Plan & List (Mock)
        if mock_session:
            mock_session["meal_plan"] = generated_plan_data
            mock_session["shopping_list"] = shopping_list_data
            mock_session["status"] = "done"
        
        return {"status": "done", "ingredients": ingredients}

    except Exception as e:
        print(f"Analysis Error: {e}")
        traceback.print_exc()
        if db_session:
            db_session.status = "error"
            db.commit()
        if mock_session:
            mock_session["status"] = "error"
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/session/{session_id}/result")
def get_session_result(session_id: str, db: Session = Depends(database.get_db)):
    # Try DB
    try:
        db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if db_session:
            return {
                "status": db_session.status,
                "ingredients": db_session.detected_ingredients,
                "mealPlan": db_session.meal_plan.content if db_session.meal_plan else [],
                "shoppingList": db_session.shopping_list.content if db_session.shopping_list else []
            }
    except:
        pass
        
    # Try Mock
    if session_id in MOCK_SESSIONS:
        s = MOCK_SESSIONS[session_id]
        return {
            "status": s["status"],
            "ingredients": s["detected_ingredients"],
            "mealPlan": s["meal_plan"],
            "shoppingList": s["shopping_list"]
        }
        
    raise HTTPException(status_code=404, detail="Session not found")
