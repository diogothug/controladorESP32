# Mock urequests module for MicroPython
# Simulates HTTP requests for testing firmware

import json as _json

# Simulated Tide API response data
MOCK_TIDE_DATA = {
    "success": True,
    "data": [{
        "id": 1,
        "harbor_name": "Porto de Ilhéus",
        "mean_level": 1.1,
        "months": [{
            "month": 1,
            "days": [{
                "day": 9,
                "hours": [
                    {"hour": "00:15", "level": 0.3},
                    {"hour": "06:30", "level": 1.8},
                    {"hour": "12:45", "level": 0.4},
                    {"hour": "18:58", "level": 1.9},
                ]
            }]
        }]
    }]
}

# Simulated WorldTides API response
MOCK_WORLDTIDES_DATA = {
    "status": 200,
    "callCount": 1,
    "copyright": "Tidal data from WorldTides",
    "requestLat": -14.78,
    "requestLon": -39.03,
    "responseLat": -14.78,
    "responseLon": -39.03,
    "atlas": "TPXO",
    "station": "Porto de Ilhéus",
    "extremes": [
        {"dt": 1736380500, "date": "2026-01-09T00:15:00+0000", "height": 0.3, "type": "Low"},
        {"dt": 1736402700, "date": "2026-01-09T06:30:00+0000", "height": 1.8, "type": "High"},
        {"dt": 1736425500, "date": "2026-01-09T12:45:00+0000", "height": 0.4, "type": "Low"},
        {"dt": 1736447880, "date": "2026-01-09T18:58:00+0000", "height": 1.9, "type": "High"},
    ]
}

# Response class mimicking urequests.Response
class Response:
    def __init__(self, text, status_code=200):
        self._text = text
        self.status_code = status_code
        self.content = text.encode('utf-8')
    
    @property
    def text(self):
        return self._text
    
    def json(self):
        return _json.loads(self._text)
    
    def close(self):
        pass  # No-op for mock

# Track request history for testing
request_history = []

def reset_history():
    """Reset request history for test isolation"""
    global request_history
    request_history = []

def get_history():
    """Get list of all requests made"""
    return request_history.copy()

def get(url, headers=None, timeout=None):
    """
    Mock HTTP GET request
    
    Simulates the Tide API based on URL patterns
    """
    global request_history
    request_history.append({
        'method': 'GET',
        'url': url,
        'headers': headers
    })
    
    # Check custom responses first
    for pattern, (data, status) in _custom_responses.items():
        if pattern in url:
            return Response(_json.dumps(data), status)
    
    # Parse URL to determine response
    if 'worldtides.info' in url or 'extremes' in url:
        # WorldTides API request
        return Response(_json.dumps(MOCK_WORLDTIDES_DATA))
    
    elif 'tabua-mare' in url:
        # Tábua de Marés request
        return Response(_json.dumps(MOCK_TIDE_DATA))
    
    elif 'harbor_names' in url:
        # Harbor list request
        harbors = [
            {"id": 1, "harbor_name": "Porto de Ilhéus"},
            {"id": 2, "harbor_name": "Porto de Salvador"},
            {"id": 3, "harbor_name": "Porto de Maceió"}
        ]
        return Response(_json.dumps({"success": True, "data": harbors}))
    
    elif 'harbor/' in url:
        # Single harbor info
        harbor = {"id": 1, "harbor_name": "Porto de Ilhéus", "state": "ba"}
        return Response(_json.dumps({"success": True, "data": [harbor]}))
    
    elif 'states' in url:
        # States list
        states = ["ba", "pb", "pe", "rj", "sp", "sc"]
        return Response(_json.dumps({"success": True, "data": states}))
    
    else:
        # Generic 404 for unknown endpoints
        return Response('{"success": false, "error": "Not found"}', 404)

def post(url, data=None, json=None, headers=None, timeout=None):
    """Mock HTTP POST request (minimal implementation)"""
    global request_history
    request_history.append({
        'method': 'POST',
        'url': url,
        'data': data,
        'json': json
    })
    return Response('{"success": true}')

def put(url, data=None, json=None, headers=None, timeout=None):
    """Mock HTTP PUT request (minimal implementation)"""
    return Response('{"success": true}')

def delete(url, headers=None, timeout=None):
    """Mock HTTP DELETE request (minimal implementation)"""
    return Response('{"success": true}')

# Utility to set custom mock data for specific tests
_custom_responses = {}

def set_mock_response(url_pattern, response_data, status_code=200):
    """Set a custom response for a URL pattern"""
    _custom_responses[url_pattern] = (response_data, status_code)

def clear_mock_responses():
    """Clear all custom responses"""
    global _custom_responses
    _custom_responses = {}
