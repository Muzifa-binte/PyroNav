"""
Sensor ingestion (Member 1): MQTT → validate → PostgreSQL → event bus.

Messages published by the 3D hospital app (hospital-3d/), the simulator or real
devices on ``pyronav/v1/sensors/{room_id}/{sensor_id}/reading`` are validated
against shared-contracts/sensor-message-schema.json, stored in
``sensor_readings`` and forwarded on the in-process event bus as
``sensor_reading_received`` — the event Member 2's Decision Engine subscribes to.

Enable inside the API process (backend/.env):
    BACKGROUND_SERVICES=sensor_ingestion.service

See README.md in this folder.
"""
