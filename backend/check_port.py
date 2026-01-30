import socket
import sys

def check_port(host, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        if result == 0:
            print(f"✅ Success: {host}:{port} is accepting connections")
            sock.close()
            return True
        else:
            print(f"❌ Error: {host}:{port} refused connection (Code: {result})")
            sock.close()
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    check_port("127.0.0.1", 8001)
