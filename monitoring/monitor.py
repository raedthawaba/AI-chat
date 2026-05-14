import psutil
import torch
import time
import json
import os

def get_gpu_info():
    if torch.cuda.is_available():
        return {
            "name": torch.cuda.get_device_name(0),
            "memory_allocated": torch.cuda.memory_allocated(0) / 1024**2,
            "memory_reserved": torch.cuda.memory_reserved(0) / 1024**2,
            "utilization": "N/A" # يحتاج pynvml للحصول على النسبة الدقيقة
        }
    return "No GPU available"

def monitor_system(interval=5, duration=60):
    stats_history = []
    print(f"Starting monitoring for {duration} seconds...")
    
    for _ in range(0, duration, interval):
        stats = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "cpu_percent": psutil.cpu_percent(interval=None),
            "ram_percent": psutil.virtual_memory().percent,
            "ram_used_gb": psutil.virtual_memory().used / 1024**3,
            "gpu": get_gpu_info()
        }
        stats_history.append(stats)
        print(f"CPU: {stats['cpu_percent']}% | RAM: {stats['ram_percent']}%")
        time.sleep(interval)
        
    # حفظ السجل
    log_path = "/home/ubuntu/arabic_ai_engine/monitoring/system_stats.json"
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, 'w') as f:
        json.dump(stats_history, f, indent=4)
    print(f"Monitoring logs saved to {log_path}")

if __name__ == "__main__":
    monitor_system(interval=2, duration=10)
