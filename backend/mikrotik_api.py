"""
MikroTik RouterOS API — sketch.

In production, use the `librouteros` package:
    pip install librouteros

    from librouteros import connect
    api = connect(username='admin', password='...', host='192.168.88.1')
    list(api(cmd='/ip/hotspot/active/print'))

For now we return mocked telemetry so the UI can render. Replace `fetch_status`
and `grant_session` with real calls when you wire up your hardware.
"""
import random, time
from typing import Optional


class MikrotikClient:
    def __init__(self, ip: str, user: str = "admin",
                 password: Optional[str] = None, port: int = 8728):
        self.ip = ip
        self.user = user
        self.password = password
        self.port = port
        # In real life:
        # self.api = connect(username=user, password=password, host=ip, port=port)

    def fetch_status(self) -> dict:
        """Return CPU/RAM/throughput. Replace with /system/resource/print + /interface/monitor-traffic."""
        return {
            "cpu": random.randint(20, 70),
            "ram": random.randint(40, 80),
            "users": random.randint(5, 35),
            "up": random.randint(8, 30),
            "down": random.randint(20, 80),
            "status": "online",
            "checked_at": int(time.time()),
        }

    def grant_session(self, user_phone: str, minutes: int = 30) -> dict:
        """
        Allow a captive-portal user through.

        Real implementation (RouterOS hotspot):
            self.api(cmd='/ip/hotspot/active/login',
                     user=user_phone, password='', mac=mac_addr)
            # or add a temporary /ip/firewall/address-list entry
        """
        return {"ok": True, "user": user_phone, "minutes": minutes,
                "method": "hotspot.active.login"}

    def list_active(self) -> list[dict]:
        """list of currently-connected hotspot users."""
        return []

    def kick(self, user_phone: str) -> dict:
        """Force-disconnect a user. Real call: /ip/hotspot/active/remove."""
        return {"ok": True, "kicked": user_phone}
