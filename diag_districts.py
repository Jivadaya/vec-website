import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

SUPABASE_DB = {
    "host": os.getenv("SUPABASE_DB_HOST"),
    "dbname": os.getenv("SUPABASE_DB_NAME"),
    "user": os.getenv("SUPABASE_DB_USER"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
    "port": int(os.getenv("SUPABASE_DB_PORT", 6543))
}

def check_districts():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        # Check unique districts
        cur.execute('SELECT DISTINCT "District" FROM students WHERE "District" IS NOT NULL ORDER BY "District"')
        districts = cur.fetchall()
        print(f"--- Unique Districts in 'students' table ({len(districts)}) ---")
        for d in districts:
            print(f"- {d[0]}")
            
        # Check total row count
        cur.execute('SELECT COUNT(*) FROM students')
        total = cur.fetchone()[0]
        print(f"\nTotal students: {total}")
        
        # Check rows per district
        cur.execute('SELECT "District", COUNT(*) FROM students GROUP BY "District" ORDER BY COUNT(*) DESC')
        counts = cur.fetchall()
        print("\nRows per district:")
        for row in counts:
            print(f"{row[0]}: {row[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_districts()
