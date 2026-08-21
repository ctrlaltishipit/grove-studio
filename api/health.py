# =============================================================================
# Grove — api/health.py  →  GET /api/health
#
# Reports whether the server-side configuration is complete. Names of missing
# variables only — never a value, never a prefix of a value. Stdlib only.
# =============================================================================
import json
import os
from http.server import BaseHTTPRequestHandler

REQUIRED = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LLM_API_KEY")
OPTIONAL = ("LLM_MODEL", "CRON_SECRET", "APP_URL", "ALLOWED_ORIGIN")


def report():
    missing = [n for n in REQUIRED if not os.environ.get(n)]
    return {
        "ok": True,
        "configured": not missing,
        "missing": missing,
        "optional_unset": [n for n in OPTIONAL if not os.environ.get(n)],
        "model": os.environ.get("LLM_MODEL", "gemini-3.7-flash"),
    }


class handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        body = json.dumps(report()).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
