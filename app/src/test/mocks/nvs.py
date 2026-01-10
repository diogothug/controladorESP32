# Mock NVS (Non-Volatile Storage) module for MicroPython
# Simulates persistent storage for testing

_storage = {}

def set_str(key, value):
    """Store a string value"""
    _storage[key] = value

def get_str(key):
    """Retrieve a string value"""
    return _storage.get(key)

def set_int(key, value):
    """Store an integer value"""
    _storage[key] = value

def get_int(key):
    """Retrieve an integer value"""
    return _storage.get(key)

def commit():
    """Commit changes (no-op in mock)"""
    pass

def erase_key(key):
    """Remove a key"""
    if key in _storage:
        del _storage[key]

def erase_all():
    """Clear all storage"""
    _storage.clear()

def reset():
    """Reset storage for test isolation"""
    _storage.clear()
