path = r'c:\yedekler\OneDrive\Masaüstüm\ClassNotes\Yapay_Zeka_Ders\cognitive-logix\frontend\src\styles.css'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

checks = ['guide-grid', 'guide-card', 'guide-step', 'kpi-card-v2', 'kpi-v2-value', 'kpi-v2-spark', 'sidebar-user-section', 'kpi-v2-xai']
for c in checks:
    status = "OK" if c in content else "MISSING"
    print(c + ": " + status)

print("Total chars: " + str(len(content)))

# Check last 500 chars for issues
print("\n--- Last 300 chars ---")
print(repr(content[-300:]))
