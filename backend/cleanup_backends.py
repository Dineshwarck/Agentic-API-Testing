
import psutil
import sys

def kill_duplicate_backends():
    count = 0
    me = psutil.Process()
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if proc.info['name'] == 'python.exe' and 'runserver' in (proc.info['cmdline'] or []):
                # Don't kill myself if I am running this via run_command python
                if proc.pid != me.pid:
                    print(f"Killing duplicate backend PID: {proc.pid}")
                    proc.kill()
                    count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    print(f"Killed {count} duplicate backend processes.")

if __name__ == "__main__":
    kill_duplicate_backends()
