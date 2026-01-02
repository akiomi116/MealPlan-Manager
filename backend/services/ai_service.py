import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Use a model that supports vision and JSON mode if possible, 
# or use standard prompting. Gemini 1.5 Flash is good for speed/cost.
MODEL_NAME = "gemini-2.5-flash" 

def upload_to_gemini(path, mime_type="image/jpeg"):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    # Verify usage if needed, but for now just return the file object
    return file

# --- Prompts ---

INGREDIENT_PROMPT = """
Analyze these images of a refrigerator/pantry. 
Identify all food ingredients visible.
Also, if you see any receipts or flyers, extract the item names from them as well.

RETURN JSON ONLY.
Output strictly in Japanese.
Format:
{
  "ingredients": ["卵", "牛乳", "人参", "豚肉", ...]
}
"""

PLANNING_PROMPT = """
You are a Smart Meal Planner AI.
Based on the provided INGREDIENTS and BARGAIN_ITEMS, create a 1-week meal plan.

Rules:
1. Prioritize using the INGREDIENTS (minimize waste).
2. Incorporate BARGAIN_ITEMS where possible to save money.
3. Suggest a Shopping List for missing items needed for the plan.
4. Output strictly in Japanese.

RETURN JSON ONLY. Format:
{
  "meal_plan": [
    {
      "day": "月曜日",
      "meals": {
        "breakfast": "...",
        "lunch": "...",
        "dinner": "..."
      }
    },
    ...
  ],
  "shopping_list": [
     {"item": "...", "reason": "missing / bargain / stock"}
  ]
}
"""

def detect_ingredients(image_paths: list[str]):
    api_key = os.getenv("GOOGLE_API_KEY")
    # Fail fast if API key is missing or default
    if not api_key or "INSERT_YOUR_KEY" in api_key or "dummy" in api_key or len(api_key) < 10:
        print("WARN: Invalid GOOGLE_API_KEY. Returning mock data.")
        return {"ingredients": ["Egg (Mock)", "Milk (Mock)", "Carrot (Mock)", "Pork (Mock)"]}

    try:
        model = genai.GenerativeModel(MODEL_NAME, generation_config={"response_mime_type": "application/json"})
        
        parts = [INGREDIENT_PROMPT]
        uploaded_files = []
        
        for path in image_paths:
            if os.path.exists(path):
                # Upload file to Gemini (returns a file handle)
                uploaded_file = upload_to_gemini(path)
                uploaded_files.append(uploaded_file)
                parts.append(uploaded_file)
        
        if len(uploaded_files) == 0:
             return {"ingredients": []}

        response = model.generate_content(parts)
        
        # Cleanup uploaded files (optional but good practice if short lived)
        # for f in uploaded_files:
        #    f.delete() 
            
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Gemini Detection Error: {e}")
        return {"ingredients": ["Mock_Egg", "Mock_Milk", "Mock_Spinach"]}

def generate_plan(ingredients: list[str], bargain_items: list[str]):
    # Allow mock plan if in mock mode
    if any("(Mock)" in i for i in ingredients):
        time.sleep(1) # Simulate thinking
        return {
            "meal_plan": [
                {"day": "Monday", "meals": {"breakfast": "Mock Toast", "lunch": "Mock Pasta", "dinner": "Mock Curry"}},
                {"day": "Tuesday", "meals": {"breakfast": "Cereal", "lunch": "Sandwich", "dinner": "Stir Fry"}},
            ],
            "shopping_list": [
                {"item": "Onion", "reason": "missing for Curry"},
                {"item": "Bread", "reason": "missing for Toast"}
            ]
        }

    user_content = f"INGREDIENTS: {', '.join(ingredients)}\nBARGAIN_ITEMS: {', '.join(bargain_items)}"
    
    try:
        model = genai.GenerativeModel(MODEL_NAME, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content([PLANNING_PROMPT, user_content])
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Gemini Planning Error: {e}")
        return {
            "meal_plan": [{"day": "Monday", "meals": {"breakfast": "Toast", "lunch": "Pasta", "dinner": "Curry"}}],
            "shopping_list": []
        }
