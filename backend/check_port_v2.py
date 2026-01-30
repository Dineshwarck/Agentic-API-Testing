import socket
import sys

def check_port(host, port):
    print(f"Checking {host}:{port}...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5) # Longer timeout
        result = sock.connect_ex((host, port))
        if result == 0:
            print(f"✅ Success: {host}:{port} is OPEN")
            return True
        else:
            print(f"❌ Error: {host}:{port} status code: {result}")
            # 10061 = Refused (Port Closed)
            # 10035 = Would Block (Timeout/Pending)
            if result == 10061:
                print("   -> Connection REFUSED (Server likely down)")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    finally:
        sock.close()

if __name__ == "__main__":
    check_port("localhost", 8001)
    check_port("127.0.0.1", 8001)
