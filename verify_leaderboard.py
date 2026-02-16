import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08",
    "port": 6543
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
