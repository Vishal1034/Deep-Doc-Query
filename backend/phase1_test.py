import ollama

def test_connection():
    print("--- Testing Ollama Connection ---")
    try:
        response = ollama.chat(model='llama3', messages=[
            {
                'role': 'user',
                'content': 'Respond with only the word "Ready" if you can hear me.',
            },
        ])
        print(f"Ollama Status: {response['message']['content']}")
    except Exception as e:
        print(f"Error: {e}. Is Ollama running in the background?")

if __name__ == "__main__":
    test_connection()
