import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08", 
    "port": 6543
}

def check_districts():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        print("Checking unique districts in 'students' table...")
        cur.execute('SELECT "District", COUNT(*) FROM students GROUP BY "District" ORDER BY COUNT(*) DESC LIMIT 20')
        districts = cur.fetchall()
        
        print(f"{'District':<30} | {'Count':<10}")
        print("-" * 45)
        for dist, count in districts:
            print(f"{str(dist):<30} | {count:<10}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_districts()
