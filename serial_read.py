import serial
import time

SERIAL_PORT = "COM7"
BAUD_RATE = 115200
OUTPUT_FILE = "data_log.txt"

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
time.sleep(2)

print(f"Listening on {SERIAL_PORT} @ {BAUD_RATE} baud...")

with open(OUTPUT_FILE, "a") as f:
    try:
        while True:
            line = ser.readline().decode("utf-8").strip()
            if line:
                parts = line.split(" ")
                if len(parts) == 3:
                    try:
                        x = float(parts[0])
                        y = float(parts[1])
                        z = float(parts[2])
                        entry = f"{x:.5f},{y:.5f},{z:.5f}\n"
                        f.write(entry)
                        f.flush()
                        print(entry.strip())
                    except ValueError:
                        print(f"Invalid data: {line}")
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        ser.close()
