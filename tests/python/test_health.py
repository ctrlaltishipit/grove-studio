# Grove — GET /api/health. Names of what is missing, four RLS booleans or
# null, and never a value from the environment. See api/health.py.
import json
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer

import pytest

import health
from conftest import http

URL = "https://example.supabase.co"
KEY = "service-role-test-key"
ROWS = [
    {"table_name": "sessions", "enabled": True},
    {"table_name": "participants", "enabled": True},
    {"table_name": "notes", "enabled": False},
    {"table_name": "findings", "enabled": True},
]


class FakeResponse:
    def __init__(self, payload):
        self._raw = json.dumps(payload).encode()
        self.status = 200

    def read(self):
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def with_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", URL)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", KEY)
    monkeypatch.setenv("LLM_API_KEY", "llm-test-key")


def no_secrets(report):
    dumped = json.dumps(report)
    assert KEY not in dumped and URL not in dumped and "llm-test-key" not in dumped


# ---------------------------------------------------------------- report()
def test_report_without_env_is_names_only(monkeypatch):
    for name in health.REQUIRED + health.OPTIONAL:
        monkeypatch.delenv(name, raising=False)
    calls = []
    monkeypatch.setattr(urllib.request, "urlopen", lambda *a, **k: calls.append(1))
    r = health.report()
    assert r["ok"] is True and r["configured"] is False
    assert r["missing"] == list(health.REQUIRED)
    assert r["optional_unset"] == list(health.OPTIONAL)
    assert r["rls"] is None
    assert calls == []                       # nothing to call with, so no call
    no_secrets(r)


def test_report_with_env_maps_rls_rows(monkeypatch):
    with_env(monkeypatch)
    seen = {}

    def fake_urlopen(req, timeout=None):
        seen["url"] = req.full_url
        seen["method"] = req.get_method()
        seen["headers"] = {k.lower(): v for k, v in req.header_items()}
        seen["timeout"] = timeout
        return FakeResponse(ROWS)

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    r = health.report()
    assert r["configured"] is True and r["missing"] == []
    assert r["rls"] == {"sessions": True, "participants": True, "notes": False, "findings": True}
    assert seen["url"] == f"{URL}/rest/v1/rpc/rls_status"
    assert seen["method"] == "POST"
    assert seen["timeout"] == 5
    assert seen["headers"]["apikey"] == KEY
    assert seen["headers"]["authorization"] == f"Bearer {KEY}"
    no_secrets(r)


def test_missing_table_row_is_false_not_true(monkeypatch):
    with_env(monkeypatch)
    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=None: FakeResponse(ROWS[:2]))
    r = health.report()
    assert r["rls"] == {"sessions": True, "participants": True, "notes": False, "findings": False}


@pytest.mark.parametrize("failure", [
    urllib.error.URLError("connection refused"),
    urllib.error.HTTPError("u", 404, "function does not exist", {}, None),
    TimeoutError("timed out"),
])
def test_report_rls_null_when_the_call_fails(monkeypatch, failure):
    with_env(monkeypatch)

    def boom(req, timeout=None):
        raise failure

    monkeypatch.setattr(urllib.request, "urlopen", boom)
    r = health.report()
    assert r["configured"] is True
    assert r["rls"] is None
    no_secrets(r)


@pytest.mark.parametrize("payload", [{"message": "permission denied"}, "oops", None])
def test_report_rls_null_on_an_unexpected_shape(monkeypatch, payload):
    with_env(monkeypatch)
    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=None: FakeResponse(payload))
    assert health.report()["rls"] is None


# ---------------------------------------------------------------- handler
@pytest.fixture(scope="module")
def health_server():
    httpd = HTTPServer(("127.0.0.1", 0), health.handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


def test_get_returns_json_with_rls(health_server, monkeypatch):
    with_env(monkeypatch)
    monkeypatch.setattr(health, "rls_status", lambda: {"sessions": True, "participants": True, "notes": True, "findings": True})
    status, body = http(f"{health_server}/api/health")
    assert status == 200 and body["ok"] is True and body["configured"] is True
    assert body["rls"] == {"sessions": True, "participants": True, "notes": True, "findings": True}
    no_secrets(body)
