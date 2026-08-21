# Grove — the engine's contract. If any of these fail, the product's core
# number is wrong. See api/synthesise.py and PRD §11 / TDD §9.
import json

import pytest

import synthesise
from conftest import (FakeSupa, N, P1, P2, P3, SESSION_ID, good_findings, http, seeded_reads)


# ---------------------------------------------------------------- validate()
def f(**over):
    base = {"theme": "A real theme", "summary": "A summary that is long enough to be real.",
            "supporting_note_ids": [N[0]], "has_disagreement": False, "disagreement_note": None}
    base.update(over)
    return base


@pytest.mark.parametrize("obj", [
    "not an object", [], {"findings": []}, {"findings": "x"},
    {"findings": [f()] * 13},
    {"findings": ["not a dict"]},
    {"findings": [f(theme="ab")]}, {"findings": [f(theme="x" * 81)]},
    {"findings": [f(summary="short")]}, {"findings": [f(summary="s" * 401)]},
    {"findings": [f(supporting_note_ids=[])]}, {"findings": [f(supporting_note_ids=[1, 2])]},
    {"findings": [f(has_disagreement="yes")]},
    {"findings": [f(disagreement_note=5)]}, {"findings": [f(disagreement_note="d" * 601)]},
    {"findings": [f(has_disagreement=True, disagreement_note="")]},
    {"findings": [f(has_disagreement=True, disagreement_note="   ")]},
])
def test_validate_rejects(obj):
    with pytest.raises(synthesise.LLMBadOutput):
        synthesise.validate(obj)


def test_validate_accepts_good():
    assert synthesise.validate(good_findings())["findings"][0]["theme"].startswith("Insurance")


def test_strip_fences():
    assert synthesise.strip_fences("```json\n{\"a\":1}\n```") == '{"a":1}'
    assert synthesise.strip_fences('{"a":1}') == '{"a":1}'


# ---------------------------------------------------------------- payload ladder
def test_gemini3_payload_no_temperature_low_thinking(monkeypatch):
    monkeypatch.setattr(synthesise, "LLM_MODEL", "gemini-3.7-flash")
    g = synthesise._gemini_payload("p", "json_schema")["generationConfig"]
    assert "temperature" not in g
    assert g["thinkingConfig"] == {"thinkingLevel": "LOW"}
    assert g["responseJsonSchema"]["properties"]["findings"]["items"]["properties"]["disagreement_note"]["type"] == ["string", "null"]
    assert "responseSchema" not in g


def test_gemini25_payload_keeps_temperature(monkeypatch):
    monkeypatch.setattr(synthesise, "LLM_MODEL", "gemini-2.5-flash")
    g = synthesise._gemini_payload("p", "json_schema")["generationConfig"]
    assert g["temperature"] == 0.2


def test_openapi_and_plain_rungs(monkeypatch):
    monkeypatch.setattr(synthesise, "LLM_MODEL", "gemini-3.7-flash")
    o = synthesise._gemini_payload("p", "openapi")["generationConfig"]
    assert "responseSchema" in o and "thinkingConfig" not in o and "responseJsonSchema" not in o
    p = synthesise._gemini_payload("p", "plain")["generationConfig"]
    assert set(p) == {"maxOutputTokens", "responseMimeType"}


def test_system_instruction_is_top_level():
    body = synthesise._gemini_payload("hello", "json_schema")
    assert body["systemInstruction"]["parts"][0]["text"].startswith("You are the synthesis engine")
    assert body["contents"][0]["role"] == "user"


def envelope(obj):
    return json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps(obj)}]}}]}).encode()


def test_ladder_walks_on_400(monkeypatch):
    modes = []

    def fake_call(prompt, mode):
        modes.append(mode)
        return (400, b"bad schema") if mode != "plain" else (200, envelope(good_findings()))

    monkeypatch.setattr(synthesise, "_gemini_call", fake_call)
    text = synthesise.call_llm("p")
    assert modes == ["json_schema", "openapi", "plain"]
    assert json.loads(text)["findings"]


def test_ladder_stops_on_first_success(monkeypatch):
    modes = []
    monkeypatch.setattr(synthesise, "_gemini_call", lambda p, m: (modes.append(m), (200, envelope(good_findings())))[1])
    synthesise.call_llm("p")
    assert modes == ["json_schema"]


def test_non_400_error_does_not_walk(monkeypatch):
    modes = []
    monkeypatch.setattr(synthesise, "_gemini_call", lambda p, m: (modes.append(m), (429, b"slow down"))[1])
    with pytest.raises(synthesise.LLMBadOutput):
        synthesise.call_llm("p")
    assert modes == ["json_schema"]


def test_thought_parts_are_ignored(monkeypatch):
    raw = json.dumps({"candidates": [{"content": {"parts": [
        {"text": "thinking…", "thought": True}, {"text": json.dumps(good_findings())}]}}]}).encode()
    monkeypatch.setattr(synthesise, "_gemini_call", lambda p, m: (200, raw))
    assert json.loads(synthesise.call_llm("p"))["findings"]


# ---------------------------------------------------------------- handler
def post(server, sid=SESSION_ID, jwt="jwt", body=None):
    return http(f"{server}/api/synthesise", "POST", body if body is not None else {"session_id": sid},
                {"Authorization": f"Bearer {jwt}"} if jwt else {})


def test_get_is_405_json(server):
    status, body = http(f"{server}/api/synthesise")
    assert status == 405 and body["code"] == "METHOD_NOT_ALLOWED"


def test_bad_session_id_400(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    status, body = post(server, sid="not-a-uuid")
    assert status == 400 and body["code"] == "BAD_REQUEST"


def test_missing_jwt_401(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: None)
    status, body = post(server, jwt="")
    assert status == 401 and body["code"] == "UNAUTHORISED"


def test_non_participant_403(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa({f"/rest/v1/participants?session_id=eq.{SESSION_ID}&user_id=": []})
    monkeypatch.setattr(synthesise, "supa", fake)
    status, body = post(server)
    assert status == 403 and body["code"] == "NOT_A_PARTICIPANT"


def test_one_lane_two_notes_409(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    notes = [{"id": N[0], "participant_id": P1, "kind": "observation", "body": "a"},
             {"id": N[1], "participant_id": P1, "kind": "observation", "body": "b"}]
    monkeypatch.setattr(synthesise, "supa", FakeSupa(seeded_reads(notes=notes)))
    status, body = post(server)
    assert status == 409 and body["code"] == "TOO_FEW_NOTES"


def test_timeout_504_and_no_writes(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa(seeded_reads())
    monkeypatch.setattr(synthesise, "supa", fake)

    def slow(prompt):
        raise synthesise.LLMTimeout("timed out")
    monkeypatch.setattr(synthesise, "call_llm", slow)
    status, body = post(server)
    assert status == 504 and body["code"] == "LLM_TIMEOUT"
    assert not [c for c in fake.calls if c[0] in ("POST", "DELETE", "PATCH")]


def test_bad_json_twice_422_and_no_writes(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa(seeded_reads())
    monkeypatch.setattr(synthesise, "supa", fake)
    calls = []
    monkeypatch.setattr(synthesise, "call_llm", lambda p: (calls.append(1), "not json")[1])
    status, body = post(server)
    assert status == 422 and body["code"] == "LLM_BAD_JSON"
    assert len(calls) == 2
    assert not [c for c in fake.calls if c[0] in ("POST", "DELETE", "PATCH")]


def test_happy_path_counts_distinct_observers_and_ranks(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa(seeded_reads())
    monkeypatch.setattr(synthesise, "supa", fake)
    monkeypatch.setattr(synthesise, "call_llm", lambda p: json.dumps(good_findings()))
    status, body = post(server)
    assert status == 200 and body["ok"] and body["observer_total"] == 3
    ranks = [(x["rank"], x["observer_count"], x["has_disagreement"]) for x in body["findings"]]
    assert ranks == [(1, 3, False), (2, 2, True), (3, 1, False)]
    writes = [c[0] for c in fake.calls if c[0] in ("POST", "DELETE", "PATCH")]
    assert writes == ["DELETE", "POST", "PATCH"]
    patched = [c for c in fake.calls if c[0] == "PATCH"][0]
    assert patched[2] == {"status": "synthesised"}


def test_hallucinated_ids_dropped_before_counting(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa(seeded_reads())
    monkeypatch.setattr(synthesise, "supa", fake)
    out = good_findings()
    out["findings"][2]["supporting_note_ids"] = [N[5], "cccccccc-0000-4000-8000-000000000000", N[5]]
    out["findings"].append({"theme": "Entirely invented theme", "summary": "Cites ids that do not exist anywhere in the input.",
                            "supporting_note_ids": ["dddddddd-0000-4000-8000-000000000000"], "has_disagreement": False, "disagreement_note": None})
    monkeypatch.setattr(synthesise, "call_llm", lambda p: json.dumps(out))
    status, body = post(server)
    assert status == 200
    themes = [x["theme"] for x in body["findings"]]
    assert "Entirely invented theme" not in themes
    single = [x for x in body["findings"] if x["theme"].startswith("WhatsApp")][0]
    assert single["observer_count"] == 1 and single["supporting_note_ids"] == [N[5]]


def test_three_notes_from_one_observer_is_corroboration_of_one(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    fake = FakeSupa(seeded_reads())
    monkeypatch.setattr(synthesise, "supa", fake)
    out = {"findings": [{"theme": "One voice, three notes", "summary": "Three notes, one observer, counted once.",
                         "supporting_note_ids": [N[0], N[3], N[6]], "has_disagreement": False, "disagreement_note": None},
                        {"theme": "Two observers, two notes", "summary": "Two distinct observers noted this moment.",
                         "supporting_note_ids": [N[1], N[2]], "has_disagreement": False, "disagreement_note": None}]}
    monkeypatch.setattr(synthesise, "call_llm", lambda p: json.dumps(out))
    status, body = post(server)
    assert [(x["rank"], x["observer_count"]) for x in body["findings"]] == [(1, 2), (2, 1)]


def test_model_never_sees_names_or_participant_uuids(server, monkeypatch):
    monkeypatch.setattr(synthesise, "auth_user", lambda jwt: "user-1")
    monkeypatch.setattr(synthesise, "supa", FakeSupa(seeded_reads()))
    seen = {}
    monkeypatch.setattr(synthesise, "call_llm", lambda p: (seen.setdefault("prompt", p), json.dumps(good_findings()))[1])
    post(server)
    prompt = seen["prompt"]
    assert "Observer 1" in prompt and "Observer 3" in prompt
    for pid in (P1, P2, P3):
        assert pid not in prompt
