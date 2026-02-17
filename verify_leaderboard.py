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

def verify_leaderboard():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        cur.execute('SELECT * FROM get_district_leaderboard() LIMIT 5')
        rows = cur.fetchall()
        
        print("Latest Leaderboard (Unique Students):")
        print("--------------------------------------")
        for district, count in rows:
            print(f"{district}: {count}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_leaderboard()
