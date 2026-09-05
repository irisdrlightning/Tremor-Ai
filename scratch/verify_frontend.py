import urllib.request

html = urllib.request.urlopen('http://localhost:5173/').read().decode('utf-8')
checks = [
    'Tremor AI',
    'Doctor Portal',
    'Patient Portal',
    'Sign In to',
    'Dr. Marcus Bell, MD',
    'Eleanor Vance'
]
for c in checks:
    found = c in html
    print(f'Checking: "{c}" -> {"FOUND" if found else "NOT FOUND"}')
