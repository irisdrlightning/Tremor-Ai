"""
Tremor Ai — Authentication & Patient Service
============================================
Handles user credentials with PBKDF2 cryptographic password hashing,
session tokens, role-based authorization, ring pairing, profile management,
and medication dose logging.
"""

import os
import time
import secrets
import hashlib
from typing import Optional, Dict, Any, List, Tuple
from backend.database import get_db_connection, init_db

# In-memory session store: token -> user dict (with expiration)
_ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_EXPIRATION_SECONDS = 7 * 24 * 3600  # 7 days


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"


def verify_password(stored_hash: str, provided_password: str) -> bool:
    """Verify provided password against stored salt:hash string."""
    try:
        salt, key_hex = stored_hash.split(":")
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False


def signup_user(
    email: str,
    password: str,
    role: str,
    full_name: Optional[str] = None,
    clinic_name: Optional[str] = None,
    custom_linked_id: Optional[str] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Register a new patient or doctor account.
    Returns: (success, message, user_dict)
    """
    email = email.strip().lower()
    if not email or "@" not in email or "." not in email:
        return False, "Please enter a valid email address.", None
    if len(password) < 6:
        return False, "Password must be at least 6 characters.", None

    role = role.strip().lower()
    if role not in ["patient", "doctor"]:
        return False, "Invalid account role specified.", None

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if email already registered
    cursor.execute("SELECT user_id FROM users WHERE email = ?", (email,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return False, "An account with this email already exists.", None

    # Generate identifiers
    user_id = f"usr_{secrets.token_hex(8)}"
    if custom_linked_id:
        linked_id = custom_linked_id
    elif role == "patient":
        linked_id = f"PAT-{secrets.token_hex(3).upper()}"
    else:
        linked_id = f"DOC-{secrets.token_hex(3).upper()}"
    display_name = full_name or ("Patient" if role == "patient" else "Dr. Physician")

    pwd_hash = hash_password(password)

    cursor.execute("""
        INSERT INTO users (user_id, role, email, password_hash, linked_id, full_name, clinic_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, role, email, pwd_hash, linked_id, display_name, clinic_name or ""))

    # If patient, create initial skeleton profile
    if role == "patient":
        cursor.execute("""
            INSERT OR IGNORE INTO patient_profiles (patient_id, full_name, medication_name, medication_schedule)
            VALUES (?, ?, ?, ?)
        """, (linked_id, display_name, "Carbidopa/Levodopa", "8:00 AM, 1:00 PM, 6:00 PM"))

    conn.commit()
    conn.close()

    # Automatically generate session token on signup
    token = secrets.token_hex(32)
    user_data = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "linked_id": linked_id,
        "full_name": display_name,
        "clinic_name": clinic_name or "",
        "token": token
    }
    _ACTIVE_SESSIONS[token] = {**user_data, "created_at": time.time()}

    return True, "Account created successfully.", user_data


def login_user(email: str, password: str, required_role: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Authenticate user and return session token.
    Follows security hygiene: generic 'Invalid email or password' error.
    """
    email = email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_id, role, email, password_hash, linked_id, full_name, clinic_name 
        FROM users WHERE email = ?
    """, (email,))
    row = cursor.fetchone()
    conn.close()

    # Constant time check even on miss to prevent timing attacks
    dummy_hash = "00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000"
    target_hash = row["password_hash"] if row else dummy_hash
    valid_pwd = verify_password(target_hash, password)

    if not row or not valid_pwd:
        return False, "Invalid email or password.", None

    if required_role and row["role"] != required_role:
        return False, f"This portal requires a {required_role} account. Please use the appropriate login.", None

    token = secrets.token_hex(32)
    user_data = {
        "user_id": row["user_id"],
        "role": row["role"],
        "email": row["email"],
        "linked_id": row["linked_id"],
        "full_name": row["full_name"] or "User",
        "clinic_name": row["clinic_name"] or "",
        "token": token
    }
    _ACTIVE_SESSIONS[token] = {**user_data, "created_at": time.time()}

    return True, "Login successful.", user_data


def logout_user(token: str) -> bool:
    """Invalidate active session token."""
    if token in _ACTIVE_SESSIONS:
        del _ACTIVE_SESSIONS[token]
        return True
    return False


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Retrieve validated user session from token."""
    sess = _ACTIVE_SESSIONS.get(token)
    if not sess:
        return None
    if time.time() - sess.get("created_at", 0) > SESSION_EXPIRATION_SECONDS:
        del _ACTIVE_SESSIONS[token]
        return None
    return sess


# -----------------------------------------------------------------------------
# Patient Profile & Ring Operations
# -----------------------------------------------------------------------------

def pair_ring_to_patient(patient_id: str, ring_id: str) -> Tuple[bool, str]:
    """Pair or re-pair a physical Ring ID to a patient, releasing any prior bindings."""
    ring_id = ring_id.strip().upper()
    if not ring_id:
        return False, "Ring ID cannot be empty."

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Ensure target patient has a profile entry so UPDATE succeeds
        cursor.execute("""
            INSERT OR IGNORE INTO patient_profiles (patient_id, full_name, medication_name, medication_schedule)
            VALUES (?, ?, ?, ?)
        """, (patient_id, "Patient", "Carbidopa/Levodopa", "8:00 AM, 1:00 PM, 6:00 PM"))

        # 2. Release this ring from any other profile to guarantee UNIQUE constraint
        cursor.execute("""
            UPDATE patient_profiles 
            SET ring_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE ring_id = ? AND patient_id != ?
        """, (ring_id, patient_id))

        # 3. Assign ring to this patient profile
        cursor.execute("""
            UPDATE patient_profiles 
            SET ring_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = ?
        """, (ring_id, patient_id))

        # 4. Deactivate old pairings for this ring in paired_rings table
        cursor.execute("""
            UPDATE paired_rings
            SET is_active = 0
            WHERE ring_id = ? AND patient_id != ?
        """, (ring_id, patient_id))

        # 5. Insert or replace active pairing record
        cursor.execute("""
            INSERT OR REPLACE INTO paired_rings (ring_id, patient_id, is_active)
            VALUES (?, ?, 1)
        """, (ring_id, patient_id))

        conn.commit()
        return True, f"Ring '{ring_id}' successfully connected!"
    except Exception as e:
        conn.rollback()
        return False, f"Could not pair ring: {e}"
    finally:
        conn.close()


def save_patient_profile(
    patient_id: str,
    full_name: str,
    age: int,
    medication_name: str,
    medication_schedule: str,
    doses_per_day: int = 3
) -> Tuple[bool, str]:
    """Save or update permanent patient clinical profile."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO patient_profiles (patient_id, full_name, age, medication_name, medication_schedule, doses_per_day, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(patient_id) DO UPDATE SET
            full_name = excluded.full_name,
            age = excluded.age,
            medication_name = excluded.medication_name,
            medication_schedule = excluded.medication_schedule,
            doses_per_day = excluded.doses_per_day,
            updated_at = CURRENT_TIMESTAMP
    """, (patient_id, full_name.strip(), age, medication_name.strip(), medication_schedule.strip(), doses_per_day))

    # Also update full_name in users table
    cursor.execute("UPDATE users SET full_name = ? WHERE linked_id = ?", (full_name.strip(), patient_id))

    conn.commit()
    conn.close()
    return True, "Profile saved successfully."


def get_patient_profile(identifier: str) -> Optional[Dict[str, Any]]:
    """Lookup patient profile by Patient ID (e.g. PAT-101, PD_01) or Ring ID (e.g. RING-7842)."""
    ident = identifier.strip().upper()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT patient_id, full_name, age, ring_id, medication_name, medication_schedule, doses_per_day, updated_at
        FROM patient_profiles
        WHERE UPPER(patient_id) = ? OR UPPER(ring_id) = ?
    """, (ident, ident))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def log_patient_dose(
    patient_id: str,
    medication_name: str,
    dose_amount: str = "Standard dose",
    notes: str = "Logged from Patient App"
) -> Tuple[bool, str, Dict[str, Any]]:
    """Log a medication intake event with exact timestamp."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_epoch = time.time()

    cursor.execute("""
        INSERT INTO dose_logs (patient_id, medication_name, timestamp_epoch, dose_amount, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (patient_id, medication_name, now_epoch, dose_amount, notes))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    dose_info = {
        "log_id": log_id,
        "patient_id": patient_id,
        "medication_name": medication_name,
        "timestamp_epoch": now_epoch,
        "time_str": time.strftime("%I:%M %p"),
        "dose_amount": dose_amount
    }
    return True, "Dose logged successfully! Medication-effectiveness model updated.", dose_info


def get_patient_recent_doses(patient_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Retrieve most recent medication intake events for a patient."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT log_id, medication_name, logged_at, timestamp_epoch, dose_amount, notes
        FROM dose_logs
        WHERE patient_id = ?
        ORDER BY timestamp_epoch DESC
        LIMIT ?
    """, (patient_id, limit))

    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def record_doctor_lookup(doctor_id: str, patient_id: str):
    """Record a doctor patient lookup event for quick-access recent list."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO doctor_recent_lookups (doctor_id, patient_id, lookup_timestamp)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    """, (doctor_id, patient_id))

    conn.commit()
    conn.close()


def get_doctor_recent_patients(doctor_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get list of recent distinct patients looked up by doctor."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DISTINCT p.patient_id, p.full_name, p.age, p.ring_id, p.medication_name, MAX(l.lookup_timestamp) as last_seen
        FROM doctor_recent_lookups l
        JOIN patient_profiles p ON l.patient_id = p.patient_id
        WHERE l.doctor_id = ?
        GROUP BY p.patient_id
        ORDER BY last_seen DESC
        LIMIT ?
    """, (doctor_id, limit))

    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def seed_demo_accounts_if_empty():
    """Ensure standard demo patient & doctor accounts exist out-of-the-box for hackathon judging."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        # 1. Demo Patient Account (directly linked to clinical profile PD_01)
        signup_user(
            email="patient@tremor.ai",
            password="patient123",
            role="patient",
            full_name="Eleanor Vance",
            custom_linked_id="PD_01"
        )
        # Link default demo profile
        save_patient_profile(
            patient_id="PD_01",
            full_name="Eleanor Vance",
            age=68,
            medication_name="Carbidopa/Levodopa 25/100 mg",
            medication_schedule="8:00 AM, 1:00 PM, 6:00 PM",
            doses_per_day=3
        )
        pair_ring_to_patient("PD_01", "RING-7842")

        # 2. Demo Doctor Account
        signup_user(
            email="doctor@tremor.ai",
            password="doctor123",
            role="doctor",
            full_name="Dr. Marcus Bell, MD",
            clinic_name="Movement Disorders Neurology Institute"
        )

        # 3. Live Hardware Patient Anchor
        save_patient_profile(
            patient_id="LIVE_COM4",
            full_name="Active Hardware Patient (COM4)",
            age=62,
            medication_name="Levodopa 25/100 mg",
            medication_schedule="Morning, Midday, Evening",
            doses_per_day=3
        )
        pair_ring_to_patient("LIVE_COM4", "RING-COM4")


# Auto-seed demo accounts
seed_demo_accounts_if_empty()
