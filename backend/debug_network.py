
import socket
import traceback

print("Testing network info retrieval...")

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print("Socket created.")
    try:
        s.connect(("8.8.8.8", 80))
        print("Socket connected.")
        ip = s.getsockname()[0]
        print(f"IP detected: {ip}")
    except Exception as e:
        print(f"Socket connect/getsockname failed: {e}")
        traceback.print_exc()
        ip = "127.0.0.1"
    finally:
        s.close()
        print("Socket closed.")
except Exception as e:
    print(f"Socket creation failed: {e}")
    traceback.print_exc()

print(f"Resulting IP: {ip}")
