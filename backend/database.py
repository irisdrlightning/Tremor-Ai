"""
Tremor Ai — SQLite Database & Schema Manager
=============================================
Manages user authentication accounts, patient profiles, paired ring devices,
and medication dose logs.
"""

import os
import sqlite3
from typing import Optional, Dict, Any, List

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "tremor_ai.db")


def get_db_connection():
    """Create and return a thread-safe connection to SQLite database."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables with constraints and foreign keys."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table (Patient & Doctor accounts)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        linked_id TEXT NOT NULL,
        full_name TEXT,
        clinic_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Patient Profiles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patient_profiles (
        patient_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        age INTEGER,
        ring_id TEXT UNIQUE,
        medication_name TEXT,
        medication_schedule TEXT,
        doses_per_day INTEGER DEFAULT 3,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Paired Rings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paired_rings (
        ring_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        paired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY(patient_id) REFERENCES patient_profiles(patient_id)
    );
    """)

    # 4. Patient Dose Logs Table (fed by 'I took my medication' button)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dose_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        medication_name TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        timestamp_epoch REAL,
        dose_amount TEXT,
        notes TEXT,
        FOREIGN KEY(patient_id) REFERENCES patient_profiles(patient_id)
    );
    """)

    # 5. Doctor-Patient Lookup History (recent patients viewed by doctor)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctor_recent_lookups (
        lookup_id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        lookup_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(doctor_id) REFERENCES users(user_id),
        FOREIGN KEY(patient_id) REFERENCES patient_profiles(patient_id)
    );
    """)

    conn.commit()
    conn.close()


# Automatically initialize tables on module import
init_db()
