import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08", 
    "port": 6543
}

def check_locations():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        # Check unique locations
        cur.execute('SELECT "Location", COUNT(*) FROM students GROUP BY "Location" ORDER BY "Location" ASC')
        counts = cur.fetchall()
        print("Location Distribution:")
        print("-" * 30)
        for row in counts:
            print(f"{row[0]}: {row[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_locations()
