#!/usr/bin/env python3
"""Grove — Gemini probe. Stdlib only.

Run before deploying: confirms LLM_API_KEY works, that LLM_MODEL exists, and
which schema rung the model accepts (responseJsonSchema → responseSchema →
plain). Prints nothing secret.

  LLM_API_KEY=… LLM_MODEL=gemini-3.7-flash python3 scripts/gemini-probe.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

KEY = os.environ.get("LLM_API_KEY") or ""
MODEL = os.environ.get("LLM_MODEL", "gemini-3.7-flash")
BASE = "https://generativelanguage.googleapis.com/v1beta"
TIMEOUT = int(os.environ.get("PROBE_TIMEOUT_S", "90"))

if not KEY:
    sys.exit("LLM_API_KEY is not set")


def call(path, body=None):
    req = urllib.request.Request(f"{BASE}/{path}{'&' if '?' in path else '?'}key={urllib.parse.quote(KEY)}",
                                 method="POST" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {}
    except Exception as e:  # socket timeout, DNS, TLS — report, never crash mid-ladder
        return 0, {"error": {"message": f"transport: {type(e).__name__}: {e}"}}


status, models = call("models?pageSize=200")
names = [m["name"].split("/", 1)[1] for m in models.get("models", [])] if status == 200 else []
print(f"models endpoint: {status}; {len(names)} models; {MODEL} {'present' if MODEL in names else 'NOT LISTED'}")
print("  flash-tier ids:", ", ".join(n for n in names if "flash" in n and "tts" not in n)[:400])

schema = {"type": "object", "additionalProperties": False, "required": ["findings"],
          "properties": {"findings": {"type": "array", "items": {"type": "object", "required": ["theme"],
                                                                   "additionalProperties": False,
                                                                   "properties": {"theme": {"type": "string"}}}}}}
prompt = {"systemInstruction": {"parts": [{"text": "Return JSON only."}]},
          "contents": [{"role": "user", "parts": [{"text": 'Return {"findings":[{"theme":"probe"}]}'}]}]}

for mode, gen in (
    ("json_schema", {"responseMimeType": "application/json", "responseJsonSchema": schema, "thinkingConfig": {"thinkingLevel": "LOW"}}),
    ("openapi", {"responseMimeType": "application/json", "responseSchema": {"type": "OBJECT", "properties": {"findings": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"theme": {"type": "STRING"}}}}}}}),
    ("plain", {"responseMimeType": "application/json"}),
):
    t0 = time.monotonic()
    status, body = call(f"models/{urllib.parse.quote(MODEL)}:generateContent", {**prompt, "generationConfig": gen})
    secs = round(time.monotonic() - t0, 1)
    if status == 200:
        parts = (body.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        try:
            parsed = json.loads(text)
            print(f"{mode}: 200 in {secs}s — parsed {parsed}")
        except ValueError:
            print(f"{mode}: 200 in {secs}s — but not JSON: {text[:120]!r}")
    else:
        msg = (body.get("error") or {}).get("message", "")[:160]
        print(f"{mode}: {status} in {secs}s — {msg}")
