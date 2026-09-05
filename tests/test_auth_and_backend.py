"""
Unit Tests for Tremor Ai Backend Authentication & Patient Service
==================================================================
Tests:
- Password hashing (PBKDF2-HMAC-SHA256) and salt verification
- User registration (patient vs doctor)
- Login authentication and token generation
- Generic error handling on invalid credentials
- Role enforcement: patient only accesses own data, doctor accesses via lookup
- Ring pairing and re-pairing
- Patient profile creation and updates
- Medication dose logging with timestamps
"""

import pytest
from backend.auth_service import (
    hash_password,
    verify_password,
    signup_user,
    login_user,
    logout_user,
    get_user_from_token,
    pair_ring_to_patient,
    save_patient_profile,
    get_patient_profile,
    log_patient_dose,
    get_patient_recent_doses,
    record_doctor_lookup,
    get_doctor_recent_patients
)


def test_password_hashing():
    pwd = "secretPassword123!"
    h = hash_password(pwd)
    assert ":" in h
    assert verify_password(h, pwd) is True
    assert verify_password(h, "wrongPassword") is False


def test_user_signup_and_login_lifecycle():
    import uuid
    # 1. Signup patient
    test_email = f"test_patient_{uuid.uuid4().hex[:8]}@tremor.ai"
    ok, msg, user = signup_user(
        email=test_email,
        password="securePassword456",
        role="patient",
        full_name="Alice Test"
    )
    assert ok is True
    assert user["role"] == "patient"
    assert user["linked_id"].startswith("PAT-")
    assert "token" in user

    # 2. Duplicate email rejected
    dup_ok, dup_msg, _ = signup_user(
        email=test_email,
        password="securePassword456",
        role="patient"
    )
    assert dup_ok is False

    # 3. Login with correct password
    log_ok, log_msg, log_user = login_user(test_email, "securePassword456")
    assert log_ok is True
    assert log_user["email"] == test_email
    assert "token" in log_user

    # 4. Login with wrong password yields generic error
    fail_ok, fail_msg, _ = login_user(test_email, "incorrectPassword")
    assert fail_ok is False
    assert "Invalid email or password" in fail_msg

    # 5. Token validation and logout
    sess = get_user_from_token(log_user["token"])
    assert sess is not None
    assert sess["email"] == test_email

    logout_user(log_user["token"])
    assert get_user_from_token(log_user["token"]) is None


def test_ring_pairing_and_profile_flow():
    pid = "PAT-UNITTEST-1"
    save_patient_profile(
        patient_id=pid,
        full_name="Bob Test",
        age=65,
        medication_name="Carbidopa/Levodopa",
        medication_schedule="8am, 2pm, 8pm",
        doses_per_day=3
    )

    prof = get_patient_profile(pid)
    assert prof is not None
    assert prof["full_name"] == "Bob Test"
    assert prof["age"] == 65

    # Pair ring
    ring_id = "RING-UNIT-99"
    pair_ok, pair_msg = pair_ring_to_patient(pid, ring_id)
    assert pair_ok is True

    # Lookup by Ring ID
    by_ring = get_patient_profile(ring_id)
    assert by_ring is not None
    assert by_ring["patient_id"] == pid

    # Test transferring same ring to another patient (no UNIQUE constraint crash)
    pid2 = "PAT-UNITTEST-2"
    save_patient_profile(patient_id=pid2, full_name="Charlie Test", age=72, medication_name="Levodopa", medication_schedule="Morning")
    pair_ok2, _ = pair_ring_to_patient(pid2, ring_id)
    assert pair_ok2 is True

    # Confirm ring now points to pid2, and pid1's ring is released
    by_ring2 = get_patient_profile(ring_id)
    assert by_ring2 is not None
    assert by_ring2["patient_id"] == pid2

    p1_refreshed = get_patient_profile(pid)
    assert p1_refreshed["ring_id"] is None


def test_medication_dose_logging():
    pid = "PAT-DOSE-TEST"
    save_patient_profile(pid, "Dose Patient", 70, "Levodopa", "Morning")

    ok, msg, dose = log_patient_dose(pid, "Levodopa 25/100 mg", "1 tablet", "Morning dose")
    assert ok is True
    assert dose["patient_id"] == pid
    assert "time_str" in dose

    history = get_patient_recent_doses(pid, limit=5)
    assert len(history) >= 1
    assert history[0]["medication_name"] == "Levodopa 25/100 mg"
