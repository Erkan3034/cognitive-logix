import urllib.request, json

def call(url, features):
    d = json.dumps({"features": features}).encode()
    req = urllib.request.Request(url, data=d, headers={"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except Exception as e:
        return {"error": str(e)}

print("=== FRAUD - EKSIK ALANLARLA (onceki durum) ===")
r = call("http://localhost:8000/fraud", {"sales": 200, "benefit_per_order": 25, "market": "Europe", "customer_segment": "Consumer"})
print("Sonuc:", round(r.get("combined_risk_score", 0) * 100, 1), "/100 -", r.get("risk_level","?"))

print("\n=== FRAUD - TAM ALANLARLA (yeni durum) ===")
cases = [
    ("Normal - Fan Shop / %0 indirim", {"sales": 200, "benefit_per_order": 25, "market": "Europe", "customer_segment": "Consumer", "order_region": "Western Europe", "category": "Fan Shop", "quantity": 1, "discount_rate": 0.0, "payment_type": "DEBIT"}),
    ("Zarar - %40 indirim / -50 kar", {"sales": 500, "benefit_per_order": -50, "market": "LATAM", "customer_segment": "Consumer", "order_region": "Central America", "category": "Fan Shop", "quantity": 10, "discount_rate": 0.4, "payment_type": "TRANSFER"}),
    ("Yuksek kurumsal - 10000$ / %30 indirim", {"sales": 10000, "benefit_per_order": 500, "market": "Pacific Asia", "customer_segment": "Corporate", "order_region": "Southeast Asia", "category": "Sporting Goods", "quantity": 50, "discount_rate": 0.3, "payment_type": "PAYMENT"}),
]
for label, f in cases:
    r = call("http://localhost:8000/fraud", f)
    if "combined_risk_score" in r:
        score = round(r["combined_risk_score"] * 100, 1)
        print(f"  {label}: {score}/100 ({r['risk_level']})")
    else:
        print(f"  HATA: {r}")

print("\n=== LOJİSTİK - TAM ALANLARLA ===")
log_cases = [
    ("Normal", {"shipping_mode": "First Class", "order_region": "Western Europe", "days_scheduled": 3, "days_real": 3, "category": "Fan Shop", "market": "Europe", "sales": 150, "quantity": 2, "benefit_per_order": 20, "discount_rate": 0.0}),
    ("Yuksek risk", {"shipping_mode": "Standard Class", "order_region": "LATAM", "days_scheduled": 7, "days_real": 12, "category": "Fan Shop", "market": "LATAM", "sales": 500, "quantity": 15, "benefit_per_order": -20, "discount_rate": 0.35}),
]
for label, f in log_cases:
    r = call("http://localhost:8000/predict", f)
    if "calibrated_delay_risk" in r:
        print(f"  {label}: %{round(r['calibrated_delay_risk']*100,1)} ({r['risk_level']})")
    else:
        print(f"  HATA: {r}")
