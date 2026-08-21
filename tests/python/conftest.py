# Grove — pytest wiring for the stdlib-only Vercel functions.
#
# api/ is added to sys.path so `import synthesise` works without a package.
# Fake env is set BEFORE import because the module reads os.environ at import.
# A real HTTPServer runs the real handler in a thread; tests monkeypatch
# `synthesise.supa` and `synthesise.call_llm`, so do_POST is exercised end to
# end with no network and no refactor of the function under test.
import json
import os
import sys
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer

import pytest

API_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "api")
sys.path.insert(0, API_DIR)

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key")
os.environ.setdefault("LLM_API_KEY", "llm-test-key")
os.environ.setdefault("LLM_MODEL", "gemini-3.7-flash")

import synthesise  # noqa: E402  (after sys.path / env)

SESSION_ID = "9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71"
P1, P2, P3 = "a1111111-1111-4111-8111-111111111111", "a2222222-2222-4222-8222-222222222222", "a3333333-3333-4333-8333-333333333333"
N = [f"bbbbbbbb-0000-4000-8000-00000000000{i}" for i in range(1, 9)]


@pytest.fixture(scope="session")
def server():
    httpd = HTTPServer(("127.0.0.1", 0), synthesise.handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


def http(url, method="GET", body=None, headers=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status, json.loads(res.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


class FakeSupa:
    """Records every PostgREST call. `reads` maps a path prefix to a response."""

    def __init__(self, reads):
        self.reads = reads
        self.calls = []

    def __call__(self, path, method="GET", body=None, prefer="return=representation"):
        self.calls.append((method, path, body))
        if method == "GET":
            for prefix, value in self.reads.items():
                if path.startswith(prefix):
                    return value
            return []
        if method == "POST":
            return [dict(row, id=f"f{i}") for i, row in enumerate(body or [])]
        return None


def seeded_reads(notes=None, participants=None):
    notes = notes if notes is not None else [
        {"id": N[0], "participant_id": P1, "kind": "observation", "body": "Insurance number step is where she stopped"},
        {"id": N[1], "participant_id": P2, "kind": "observation", "body": "Abandoned at the insurance field"},
        {"id": N[2], "participant_id": P3, "kind": "quote", "body": "I don't have my insurance number with me"},
        {"id": N[3], "participant_id": P1, "kind": "observation", "body": "Cost was the main reason she delayed"},
        {"id": N[4], "participant_id": P3, "kind": "observation", "body": "Cost was not the issue; wait time was"},
        {"id": N[5], "participant_id": P2, "kind": "observation", "body": "Trusts the WhatsApp reply over the app"},
        {"id": N[6], "participant_id": P1, "kind": "observation", "body": "Android phone on mobile data"},
        {"id": N[7], "participant_id": P3, "kind": "observation", "body": "Logged out between visits"},
    ]
    participants = participants if participants is not None else [
        {"id": P1, "joined_at": "2026-08-22T09:00:00Z"},
        {"id": P2, "joined_at": "2026-08-22T09:01:00Z"},
        {"id": P3, "joined_at": "2026-08-22T09:02:00Z"},
    ]
    return {
        f"/rest/v1/participants?session_id=eq.{SESSION_ID}&user_id=": [{"id": P1}],
        f"/rest/v1/participants?session_id=eq.{SESSION_ID}&select=id,joined_at": participants,
        f"/rest/v1/sessions?id=eq.{SESSION_ID}": [{"id": SESSION_ID, "title": "Clinic booking", "research_question": "Why abandon?"}],
        f"/rest/v1/notes?session_id=eq.{SESSION_ID}": notes,
    }


def good_findings():
    return {"findings": [
        {"theme": "Insurance step is where booking is abandoned", "summary": "All three observers recorded the participant stopping at the insurance-number field.",
         "supporting_note_ids": [N[0], N[1], N[2]], "has_disagreement": False, "disagreement_note": None},
        {"theme": "Cost versus wait time", "summary": "Observers recorded different reasons for the delay.",
         "supporting_note_ids": [N[3], N[4]], "has_disagreement": True, "disagreement_note": "One observer recorded cost as the main reason; another recorded that cost was not the issue and wait time was."},
        {"theme": "WhatsApp reply trusted over the app", "summary": "One observer recorded that the participant trusted the WhatsApp reply more than the app screen.",
         "supporting_note_ids": [N[5]], "has_disagreement": False, "disagreement_note": None},
    ]}
