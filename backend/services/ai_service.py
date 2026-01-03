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
MODEL_NAME = "gemini-flash-latest"
print(f"[Backend] Using Gemini Model: {MODEL_NAME}") 

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

For each ingredient, categorize it into one of these categories:
- 野菜 (Vegetables)
- 肉類 (Meat)
- 魚介類 (Seafood)
- 乳製品 (Dairy)
- 調味料 (Seasonings/Condiments)
- その他 (Other)

RETURN JSON ONLY.
Output strictly in Japanese.
Format:
{
  "ingredients": [
    {"name": "卵", "category": "その他"},
    {"name": "牛乳", "category": "乳製品"},
    {"name": "人参", "category": "野菜"},
    {"name": "豚肉", "category": "肉類"},
    {"name": "醤油", "category": "調味料"}
  ]
}
"""

PLANNING_PROMPT = """
You are a Smart Meal Planner AI.
Based on the provided INGREDIENTS and BARGAIN_ITEMS, create a 1-week meal plan.

Rules:
1. Prioritize using the INGREDIENTS (minimize waste).
2. Incorporate BARGAIN_ITEMS where possible to save money.
3. Suggest a Shopping List for ALL missing items. 
   **CRITICAL**: For every single dish calculated, list ALL ingredients required. If an ingredient is NOT in the provided `INGREDIENTS` list, you MUST add it to the `shopping_list`.
   (Example: If "Salmon Meuniere" is in the menu but "Salmon" is not in INGREDIENTS, you MUST add "Salmon" to `shopping_list`. Do not assume the user has basic seasonings, list everything just in case, or at least main proteins and vegetables).
4. Output strictly in Japanese.

RETURN JSON ONLY. Format:
{
  "meal_plan": [
    {
      "day": "Monday", 
      "meals": {
        "breakfast": "...",
        "lunch": "...",
        "dinner": "..."
      }
    },
    ...
  ],
  "shopping_list": [
     {"item": "...", "reason": "missing / bargain"}
  ]
}
"""

def detect_ingredients(image_paths: list[str]):
    api_key = os.getenv("GOOGLE_API_KEY")
    # Fail fast if API key is missing or default
    if not api_key or "INSERT_YOUR_KEY" in api_key or "dummy" in api_key or len(api_key) < 10:
        print("WARN: Invalid GOOGLE_API_KEY. Returning mock data.")
        return {
            "ingredients": [
                {"name": "卵", "category": "その他"},
                {"name": "牛乳", "category": "乳製品"},
                {"name": "人参", "category": "野菜"},
                {"name": "豚肉", "category": "肉類"}
            ]
        }

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
        import traceback
        print(f"Gemini Detection Error: {type(e).__name__}: {e}")
        traceback.print_exc()
        return {
            "ingredients": [
                {"name": "卵", "category": "その他"},
                {"name": "牛乳", "category": "乳製品"},
                {"name": "ほうれん草", "category": "野菜"}
            ]
        }

def generate_plan(ingredients: list, bargain_items: list[str]):
    # Handle both old format (list of strings) and new format (list of dicts)
    # Extract ingredient names for planning
    if ingredients and isinstance(ingredients[0], dict):
        ingredient_names = [ing["name"] for ing in ingredients]
    else:
        ingredient_names = ingredients
    
    # Allow mock plan if in mock mode
    if any("(Mock)" in str(i) or "Mock" in str(i) for i in ingredient_names):
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

    user_content = f"INGREDIENTS: {', '.join(ingredient_names)}\nBARGAIN_ITEMS: {', '.join(bargain_items)}"
    
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

def suggest_recipes(ingredient: str) -> list[str]:
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        prompt = f"""
        提案してください:
        「{ingredient}」をメインに使った、日本の家庭で人気のある作りやすい料理を3つ挙げてください。
        
        出力形式:
        - 料理名1
        - 料理名2
        - 料理名3
        
        余計な説明・挨拶は一切不要です。料理名のみを箇条書きで返してください。
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean up
        lines = [line.strip().replace("- ", "").replace("* ", "").replace("1. ", "") for line in text.split("\n") if line.strip()]
        return lines[:3]
    except Exception as e:
        print(f"Recipe Suggestion Error: {e}")
        return [f"{ingredient}のサラダ", f"{ingredient}の炒め物", f"{ingredient}のスープ"] # Fallback
