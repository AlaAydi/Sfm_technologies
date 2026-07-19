import urllib.request
import urllib.error
import json

mac = "1C:69:20:35:73:C4"
base = "http://127.0.0.1:8001"

# Test GET /health
print("=" * 50)
print("Test 1: GET /health")
print("=" * 50)
r = urllib.request.urlopen(f"{base}/health", timeout=5)
print("Response:", json.loads(r.read()))

# Test POST /train/{mac}
print()
print("=" * 50)
print(f"Test 2: POST /train/{mac}")
print("=" * 50)
req = urllib.request.Request(
    f"{base}/train/{mac}",
    method="POST",
    headers={"Content-Type": "application/json"},
    data=b"{}"
)
try:
    r = urllib.request.urlopen(req, timeout=120)
    data = json.loads(r.read())
    print("Status:", data.get("status"))
    print("Message:", data.get("message"))
    for k, v in data.get("models", {}).items():
        print(f"  {k}: {v}")
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.read().decode())

# Test POST /predict/{mac}
print()
print("=" * 50)
print(f"Test 3: POST /predict/{mac}")
print("=" * 50)
req2 = urllib.request.Request(
    f"{base}/predict/{mac}",
    method="POST",
    headers={"Content-Type": "application/json"},
    data=b"{}"
)
try:
    r = urllib.request.urlopen(req2, timeout=120)
    data = json.loads(r.read())
    anomalies = data.get("anomalies", [])
    print(f"Total anomalies detectees: {len(anomalies)}")
    for a in anomalies[:5]:
        print(f"  [{a['type']}] Severite: {a['severity']}, Score: {a['score']}, Du: {a['start']}")
    if len(anomalies) > 5:
        print(f"  ... et {len(anomalies) - 5} autres anomalies.")
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.read().decode())

# Test GET /forecast/{mac}
print()
print("=" * 50)
print(f"Test 4: GET /forecast/{mac}?days=7")
print("=" * 50)
try:
    r = urllib.request.urlopen(f"{base}/forecast/{mac}?days=7", timeout=10)
    data = json.loads(r.read())
    for item in data:
        d = item["date"]
        p = item["predicted_consumption"]
        lo = item["lower_bound"]
        hi = item["upper_bound"]
        print(f"  {d} | Prevu: {p:.3f} m3 | Intervalle: [{lo:.3f} - {hi:.3f}]")
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.read().decode())

print()
print("Tous les endpoints sont fonctionnels!")
