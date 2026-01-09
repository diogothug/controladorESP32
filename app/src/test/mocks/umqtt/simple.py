
# Mock umqtt.simple
class MQTTClient:
    def __init__(self, client_id, server, port=0, user=None, password=None, keepalive=0, ssl=False, ssl_params={}):
        self.server = server
        self.topic_cb = None
        self.connected = False

    def set_callback(self, f):
        self.topic_cb = f

    def connect(self):
        print(f"MOCK: MQTT Connected to {self.server}")
        self.connected = True
        return 0

    def fail_connect(self):
        # Helper to simulate failure
        raise OSError("MQTT Connection failed")

    def disconnect(self):
        self.connected = False

    def publish(self, topic, msg, retain=False, qos=0):
        print(f"MOCK: MQTT Pub {topic}: {msg}")

    def subscribe(self, topic, qos=0):
        print(f"MOCK: MQTT Sub {topic}")

    def check_msg(self):
        # Simulate receiving a message if needed
        # self.topic_cb(b'topic', b'msg')
        pass

    def wait_msg(self):
        pass
