"""
Quick test script to publish a route update to Mosquitto.
This simulates what Member 3's pathfinding engine will publish.
Uses WebSocket transport to connect to port 9001.
"""
import paho.mqtt.client as mqtt
import json
import time

def publish_test_route():
    # Use callback API version 2 (newer)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    # Connect to Mosquitto WebSocket on port 9001
    print("Connecting to Mosquitto WebSocket on localhost:9001...")
    client.ws_set_options(path="/")
    client.connect("localhost", 9001, 60)
    
    # Test route update message
    route_message = {
        "event_type": "route_updated",
        "route": {
            "route_id": "test-route-001",
            "origin_node_id": "main_lobby",
            "exit_id": "EXIT_NW",
            "node_ids": ["main_lobby", "corridor_1", "EXIT_NW"],
            "edge_ids": ["EDGE-01", "EDGE-02"],
            "total_cost": 15.5,
            "algorithm": "dijkstra",
            "status": "ROUTE_FOUND",
            "calculated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        },
        "reason": "manual_test",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    topic = "pyronav/v1/routes/updated"
    payload = json.dumps(route_message)
    
    print(f"Publishing to {topic}...")
    print(f"Payload: {json.dumps(route_message, indent=2)}")
    
    # Start network loop to process connection
    client.loop_start()
    time.sleep(1)  # Wait for connection
    
    result = client.publish(topic, payload, qos=1)
    
    # Wait for message to be sent
    result.wait_for_publish()
    
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print("✅ Message published successfully!")
    else:
        print(f"❌ Failed to publish: {result.rc}")
    
    time.sleep(0.5)  # Let message flush
    client.loop_stop()
    client.disconnect()
    print("Disconnected from Mosquitto")

if __name__ == "__main__":
    publish_test_route()
