"""
Tremor AI - Cloud & Local Hybrid Database Layer
================================================
Provides a unified database interface supporting:
1. Free Cloud MongoDB Atlas (via MONGODB_URI env var)
2. Local JSON file storage fallback (data/ directory)

When MONGODB_URI is provided, data is automatically stored in the cloud.
If not provided or offline, it transparently falls back to local JSON files.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("tremor_ai.db")

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# In read-only serverless filesystems, fall back to /tmp/data for local cache
_candidate_data_dir = os.path.join(PROJECT_ROOT, "data")
if os.path.exists("/tmp") and not os.access(PROJECT_ROOT, os.W_OK):
    DATA_DIR = "/tmp/tremor_data"
else:
    DATA_DIR = _candidate_data_dir

ACCOUNTS_FILE = os.path.join(DATA_DIR, "accounts.json")
PROFILE_FILE = os.path.join(DATA_DIR, "user_profile.json")
CHECKPOINTS_FILE = os.path.join(DATA_DIR, "live_checkpoints.json")
DOSE_LOGS_FILE = os.path.join(DATA_DIR, "medication_logs.json")

MONGODB_URI = os.getenv("MONGODB_URI", os.getenv("DATABASE_URL", ""))
DB_NAME = os.getenv("MONGODB_DB_NAME", "tremor_ai")

_mongo_client = None
_mongo_db = None
_use_mongo = False

if MONGODB_URI and MONGODB_URI.startswith("mongodb"):
    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        _mongo_client.admin.command('ping')
        _mongo_db = _mongo_client[DB_NAME]
        _use_mongo = True
        logger.info(f"Connected to Cloud MongoDB Atlas database '{DB_NAME}'.")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Falling back to local JSON storage.")
        _use_mongo = False


def is_cloud_db_connected() -> bool:
    """Returns True if connected to MongoDB Atlas."""
    return _use_mongo and _mongo_db is not None


# ==============================================================================
# Accounts & Authentication Repository
# ==============================================================================

def load_accounts_data() -> Dict[str, Any]:
    """Loads accounts from MongoDB or local JSON file."""
    if is_cloud_db_connected():
        try:
            doc = _mongo_db["accounts"].find_one({"_id": "system_accounts"})
            if doc and "data" in doc:
                return doc["data"]
        except Exception as e:
            logger.error(f"Error reading accounts from MongoDB: {e}")

    if os.path.exists(ACCOUNTS_FILE):
        try:
            with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_accounts_data(accounts: Dict[str, Any]) -> None:
    """Saves accounts to MongoDB and local JSON file."""
    if is_cloud_db_connected():
        try:
            _mongo_db["accounts"].update_one(
                {"_id": "system_accounts"},
                {"$set": {"data": accounts, "updated_at": os.times()[4]}},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error saving accounts to MongoDB: {e}")

    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
            json.dump(accounts, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to {ACCOUNTS_FILE}: {e}")


# ==============================================================================
# User Profiles Repository
# ==============================================================================

def load_profile_data() -> Dict[str, Any]:
    """Loads user profile from MongoDB or local JSON file."""
    if is_cloud_db_connected():
        try:
            doc = _mongo_db["profiles"].find_one({"_id": "user_profiles"})
            if doc and "data" in doc:
                return doc["data"]
        except Exception as e:
            logger.error(f"Error reading profiles from MongoDB: {e}")

    if os.path.exists(PROFILE_FILE):
        try:
            with open(PROFILE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_profile_data(profile: Dict[str, Any]) -> None:
    """Saves user profile to MongoDB and local JSON file."""
    if is_cloud_db_connected():
        try:
            _mongo_db["profiles"].update_one(
                {"_id": "user_profiles"},
                {"$set": {"data": profile, "updated_at": os.times()[4]}},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error saving profiles to MongoDB: {e}")

    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(PROFILE_FILE, "w", encoding="utf-8") as f:
            json.dump(profile, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to {PROFILE_FILE}: {e}")


# ==============================================================================
# Hardware Checkpoints & Sessions Repository
# ==============================================================================

def load_checkpoints_data() -> List[Dict[str, Any]]:
    """Loads physical hardware checkpoints."""
    if is_cloud_db_connected():
        try:
            docs = list(_mongo_db["checkpoints"].find({}, {"_id": 0}))
            if docs:
                return docs
        except Exception as e:
            logger.error(f"Error reading checkpoints from MongoDB: {e}")

    if os.path.exists(CHECKPOINTS_FILE):
        try:
            with open(CHECKPOINTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []
    return []


def save_checkpoint_record(checkpoint_record: Dict[str, Any]) -> None:
    """Appends a new checkpoint record to MongoDB and local JSON file."""
    if is_cloud_db_connected():
        try:
            _mongo_db["checkpoints"].insert_one(checkpoint_record.copy())
        except Exception as e:
            logger.error(f"Error inserting checkpoint to MongoDB: {e}")

    checkpoints = []
    if os.path.exists(CHECKPOINTS_FILE):
        try:
            with open(CHECKPOINTS_FILE, "r", encoding="utf-8") as f:
                checkpoints = json.load(f)
        except Exception:
            checkpoints = []
    
    checkpoints.append(checkpoint_record)
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(CHECKPOINTS_FILE, "w", encoding="utf-8") as f:
            json.dump(checkpoints, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving {CHECKPOINTS_FILE}: {e}")


def clear_all_checkpoints() -> None:
    """Clears all stored hardware checkpoints."""
    if is_cloud_db_connected():
        try:
            _mongo_db["checkpoints"].delete_many({})
        except Exception as e:
            logger.error(f"Error deleting checkpoints from MongoDB: {e}")

    if os.path.exists(CHECKPOINTS_FILE):
        try:
            os.remove(CHECKPOINTS_FILE)
        except Exception:
            pass


# ==============================================================================
# Medication Logs Repository
# ==============================================================================

def load_dose_logs_data() -> List[Dict[str, Any]]:
    """Loads logged medication dose entries."""
    if is_cloud_db_connected():
        try:
            docs = list(_mongo_db["medication_logs"].find({}, {"_id": 0}).sort("timestamp_unix", -1))
            if docs:
                return docs
        except Exception as e:
            logger.error(f"Error reading dose logs from MongoDB: {e}")

    if os.path.exists(DOSE_LOGS_FILE):
        try:
            with open(DOSE_LOGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []
    return []


def save_dose_logs_data(logs: List[Dict[str, Any]]) -> None:
    """Overwrites or synchronizes dose logs."""
    if is_cloud_db_connected():
        try:
            _mongo_db["medication_logs"].delete_many({})
            if logs:
                _mongo_db["medication_logs"].insert_many([l.copy() for l in logs])
        except Exception as e:
            logger.error(f"Error writing dose logs to MongoDB: {e}")

    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(DOSE_LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing {DOSE_LOGS_FILE}: {e}")
