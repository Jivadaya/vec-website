import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08", 
    "port": 6543
}

def check_schema():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        # Get column names
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'")
        columns = cur.fetchall()
        print("Columns in 'students' table:")
        print("-" * 30)
        for col in columns:
            print(col[0])
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
