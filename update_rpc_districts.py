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

def update_rpc():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        sql = """
        CREATE OR REPLACE FUNCTION public.get_unique_districts()
         RETURNS TABLE(dist_name text)
         LANGUAGE plpgsql
         SECURITY DEFINER
        AS $function$
        BEGIN
          RETURN QUERY
          SELECT DISTINCT "District"::text
          FROM students
          WHERE "District" IS NOT NULL
          ORDER BY "District"::text ASC;
        END;
        $function$;
        """
        
        cur.execute(sql)
        conn.commit()
        print("Successfully updated get_unique_districts RPC with SECURITY DEFINER.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_rpc()
