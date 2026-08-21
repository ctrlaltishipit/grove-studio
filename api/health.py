# =============================================================================
# Grove — api/health.py  →  GET /api/health
#
# Reports whether the server-side configuration is complete. Names of missing
# variables only — never a value, never a prefix of a value. Stdlib only.
#
# It also asks the database whether row-level security is switched on for
# each table, via public.rls_status() with the service role. The answer is
# four booleans or null; the URL and key it uses never appear in the response.
# =============================================================================
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler

REQUIRED = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LLM_API_KEY")
OPTIONAL = ("LLM_MODEL", "CRON_SECRET", "APP_URL", "ALLOWED_ORIGIN")

RLS_TABLES = ("sessions", "participants", "notes", "findings")
RLS_TIMEOUT_S = 5


def rls_status():
    """Call public.rls_status() with the service role.

    Returns {"sessions": bool, "participants": bool, "notes": bool,
    "findings": bool}, or None if the environment is incomplete or anything
    at all goes wrong. A table the function does not report is False: RLS is
    only ever claimed when the database says so.
    """
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        return None

    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/rls_status",
        method="POST",
        data=b"{}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=RLS_TIMEOUT_S) as res:
            rows = json.loads(res.read() or b"[]")
        if not isinstance(rows, list):
            return None
        found = {r.get("table_name"): r.get("enabled") for r in rows if isinstance(r, dict)}
        return {t: found.get(t) is True for t in RLS_TABLES}
    except Exception as e:
        # The type is enough for the server log. No URL, no body, no key.
        print(f"[grove] rls_status failed: {type(e).__name__}")
        return None


def report():
    missing = [n for n in REQUIRED if not os.environ.get(n)]
    return {
        "ok": True,
        "configured": not missing,
        "missing": missing,
        "optional_unset": [n for n in OPTIONAL if not os.environ.get(n)],
        "model": os.environ.get("LLM_MODEL", "gemini-3.5-flash"),
        "rls": rls_status(),
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
