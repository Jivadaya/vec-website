import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08",
    "port": 6543
}

def check_duplicates():
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        cur.execute("""
            SELECT "VEC Exam Code", COUNT(*)
            FROM students
            GROUP BY "VEC Exam Code"
            HAVING COUNT(*) > 1
            LIMIT 10
        """)
        
        duplicates = cur.fetchall()
        if duplicates:
            print("Duplicate Exam Codes found:")
            for code, count in duplicates:
                print(f"Code: {code}, Count: {count}")
        else:
            print("No duplicate Exam Codes found.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_duplicates()
