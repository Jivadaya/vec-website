import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08",
    "port": 6543
}

def update_rpc():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        sql = """
        CREATE OR REPLACE FUNCTION public.get_district_leaderboard()
         RETURNS TABLE(dist_name text, issued_count bigint)
         LANGUAGE plpgsql
        AS $function$
        BEGIN
          RETURN QUERY
          SELECT 
            CAST("District" AS text) AS d_name, 
            COUNT(DISTINCT "Name of Student")::bigint AS s_count
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
        print("Successfully updated get_district_leaderboard RPC.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_rpc()
