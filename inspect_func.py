import psycopg2

SUPABASE_DB = {
    "host": "aws-1-ap-southeast-1.pooler.supabase.com",
    "dbname": "postgres",
    "user": "postgres.qnvhtrfdwihmyjerujqa",
    "password": "RadhaKrishna@!08",
    "port": 6543
}

def save_function_definitions(func_names, output_file):
    try:
        conn = psycopg2.connect(**SUPABASE_DB, sslmode='require')
        cur = conn.cursor()
        
        with open(output_file, "w") as f:
            for func_name in func_names:
                cur.execute("""
                    SELECT prosrc 
                    FROM pg_proc 
                    WHERE proname = %s
                """, (func_name,))
                
                results = cur.fetchall()
                if results:
                    for result in results:
                        f.write(f"--- Definition of '{func_name}' ---\n")
                        f.write(result[0])
                        f.write("\n" + "="*40 + "\n\n")
                else:
                    f.write(f"Function '{func_name}' not found.\n\n")
            
        cur.close()
        conn.close()
        print(f"Definitions saved to {output_file}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    save_function_definitions(['increment_download_count'], 'func_defs_2.txt')
