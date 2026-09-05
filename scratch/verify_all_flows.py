import urllib.request
import json
import os
import sys

def verify():
    print("=== Testing FastAPI Backend Authentication ===")
    login_data = json.dumps({"email": "patient@tremor.ai", "password": "patient123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    assert resp.getcode() == 200, f"Expected 200, got {resp.getcode()}"
    p_data = json.loads(resp.read().decode())
    token = p_data["token"]
    print(f"  [PASS] Patient Login: {p_data['user']['email']} (role: {p_data['user']['role']})")

    # Doctor login
    d_data_raw = json.dumps({"email": "doctor@tremor.ai", "password": "doctor123"}).encode()
    req_d = urllib.request.Request("http://127.0.0.1:8000/auth/login", data=d_data_raw, headers={"Content-Type": "application/json"})
    resp_d = urllib.request.urlopen(req_d)
    assert resp_d.getcode() == 200
    d_data = json.loads(resp_d.read().decode())
    print(f"  [PASS] Doctor Login: {d_data['user']['email']} (role: {d_data['user']['role']})")

    # Patient profile using patient token (accessing their own linked_id)
    pat_id = p_data["user"]["linked_id"]
    req_prof = urllib.request.Request(f"http://127.0.0.1:8000/patients/{pat_id}", headers={"Authorization": f"Bearer {token}"})
    resp_prof = urllib.request.urlopen(req_prof)
    assert resp_prof.getcode() == 200
    profile = json.loads(resp_prof.read().decode())
    print(f"  [PASS] Profile Fetched: {profile['patient']['full_name']} | ID: {pat_id}")

    # Dose logging
    dose_payload = json.dumps({"medication_name": "Levodopa 100mg", "dose_amount": "1 tablet", "notes": "Taken with water"}).encode()
    req_dose = urllib.request.Request(f"http://127.0.0.1:8000/patients/{pat_id}/doses", data=dose_payload, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    resp_dose = urllib.request.urlopen(req_dose)
    assert resp_dose.getcode() == 200
    print("  [PASS] Log Medication Dose: successfully recorded")

    # Doctor Patient Overview
    req_over = urllib.request.Request("http://127.0.0.1:8000/patients/PD_01/overview?days=30", headers={"Authorization": f"Bearer {d_data['token']}"})
    resp_over = urllib.request.urlopen(req_over)
    assert resp_over.getcode() == 200
    over_data = json.loads(resp_over.read().decode())
    print(f"  [PASS] Clinical Overview Engine: Verdict = {over_data['effectiveness']['verdict']} (Confidence: {over_data['effectiveness']['confidence']}%)")

    # Streamlit health
    req_st = urllib.request.urlopen("http://localhost:8501/_stcore/health")
    assert req_st.getcode() == 200
    print("  [PASS] Streamlit Dashboard Server: HTTP 200 OK (Healthy)")

    print("\nALL BACKEND & FRONTEND INTEGRATIONS VERIFIED!")

if __name__ == "__main__":
    verify()
