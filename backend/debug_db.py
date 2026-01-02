
import psycopg2
import os

# Try connecting without any env vars first
print("--- Attempt 1: Raw Connection ---")
try:
    conn = psycopg2.connect(
        dbname="meal_manager",
        user="user",
        password="password",
        host="127.0.0.1",
        port="5432"
    )
    print("Success!")
    conn.close()
except Exception as e:
    print(f"Error (Raw): {e}")
    # Try to print repr to see bytes if decoding failed in exception string
    print(f"Error repr: {repr(e)}")

print("\n--- Attempt 2: With Client Encoding SJIS ---")
try:
    conn = psycopg2.connect(
        dbname="meal_manager",
        user="user",
        password="password",
        host="127.0.0.1",
        port="5432",
        options="-c client_encoding=sjis"
    )
    print("Success!")
    conn.close()
except Exception as e:
    print(f"Error (SJIS): {e}")

print("\n--- Attempt 3: With Client Encoding UTF8 ---")
try:
    conn = psycopg2.connect(
        dbname="meal_manager",
        user="user",
        password="password",
        host="127.0.0.1",
        port="5432",
        options="-c client_encoding=utf8"
    )
    print("Success!")
    conn.close()
except Exception as e:
    print(f"Error (UTF8): {e}")
