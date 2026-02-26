import requests

URL = 'https://qnvhtrfdwihmyjerujqa.supabase.co/rest/v1/rpc/get_unique_districts'
HEADERS = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudmh0cmZkd2lobXlqZXJ1anFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY4MjcsImV4cCI6MjA4NTgzMjgyN30.9OQZ1Qcyttry8EazLV7XR88NFBLSKST9qBKp_SBiLPA',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudmh0cmZkd2lobXlqZXJ1anFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY4MjcsImV4cCI6MjA4NTgzMjgyN30.9OQZ1Qcyttry8EazLV7XR88NFBLSKST9qBKp_SBiLPA'
}

def verify():
    try:
        print(f"Testing POST {URL}")
        resp = requests.post(URL, headers=HEADERS)
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
