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
        CREATE OR REPLACE FUNCTION public.get_district_leaderboard()
         RETURNS TABLE(dist_name text, issued_count bigint)
         LANGUAGE plpgsql
         SECURITY DEFINER
        AS $function$
        BEGIN
          RETURN QUERY
          SELECT 
            CAST("District" AS text) AS d_name, 
            COUNT(*)::bigint AS s_count
          FROM students
          WHERE "Download Count" > 0
            AND "District" IS NOT NULL
          GROUP BY "District"
          ORDER BY s_count DESC;
        END;
        $function$;
        """
        
        cur.execute(sql)
        conn.commit()
        print("Successfully optimized get_district_leaderboard RPC with SECURITY DEFINER and COUNT(*)")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_rpc()
