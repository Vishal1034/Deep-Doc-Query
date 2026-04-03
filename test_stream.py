import requests
import json

url = "http://127.0.0.1:8000/chat/stream"
payload = {"message": "What are the key features of this project?"}

print("Testing streaming endpoint...")
try:
    response = requests.post(url, json=payload, stream=True)
    print(f"Status: {response.status_code}")
    
    count = 0
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8') if isinstance(line, bytes) else line
            if line.startswith('data: '):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    if data.get('token'):
                        print(data.get('token'), end='', flush=True)
                    if data.get('sources'):
                        print(f"\n\nSources: {data.get('sources')}")
                    if data_str == "[DONE]":
                        print("\nDone!")
                        break
                except json.JSONDecodeError:
                    pass
        count += 1
        if count > 100:  # Limit output
            break
except Exception as e:
    print(f"Error: {e}")
