
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    import backend.database
    print(f"DEBUG: DATABASE_URL from backend.database = {backend.database.DATABASE_URL}")
    from backend.database import engine
    from backend.models import Base
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def reset_db():
    print("Dropping all tables...")
    try:
        Base.metadata.drop_all(bind=engine)
        print("Tables dropped.")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        return

    print("Creating all tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    reset_db()
