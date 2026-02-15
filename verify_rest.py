import requests

URL = 'https://qnvhtrfdwihmyjerujqa.supabase.co/rest/v1/students'
HEADERS = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudmh0cmZkd2lobXlqZXJ1anFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY4MjcsImV4cCI6MjA4NTgzMjgyN30.9OQZ1Qcyttry8EazLV7XR88NFBLSKST9qBKp_SBiLPA',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudmh0cmZkd2lobXlqZXJ1anFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY4MjcsImV4cCI6MjA4NTgzMjgyN30.9OQZ1Qcyttry8EazLV7XR88NFBLSKST9qBKp_SBiLPA'
}

def verify():
    # Test query format like: .select('"District"').neq('"District"', null).order('"District"', { ascending: true })
    # Translated to PostgREST syntax
    params = {
        'select': '"District"',
        '"District"': 'not.is.null',
        'order': '"District".asc',
        'limit': 5
    }
    
    try:
        print(f"Testing GET {URL} with params: {params}")
        resp = requests.get(URL, headers=HEADERS, params=params)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Success!")
            print(resp.json())
        else:
            print("Failed.")
            print(resp.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
