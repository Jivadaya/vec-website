import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB = {
    "host": os.getenv("SUPABASE_DB_HOST"),
    "dbname": os.getenv("SUPABASE_DB_NAME"),
    "user": os.getenv("SUPABASE_DB_USER"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
    "port": int(os.getenv("SUPABASE_DB_PORT", 6543))
}

def grant_rpc():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        sql = """
        GRANT EXECUTE ON FUNCTION public.get_unique_districts() TO anon, public, authenticated;
        """
        
        cur.execute(sql)
        conn.commit()
        print("Successfully granted EXECUTE to anon and public.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    grant_rpc()
