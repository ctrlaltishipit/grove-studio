# =============================================================================
# Grove — api/synthesise.py
# Vercel Python serverless function.  Repo path: api/synthesise.py  →  /api/synthesise
#
# Vercel's Python runtime maps every .py file in /api to a route and loads the
# top-level name `handler`, which must subclass BaseHTTPRequestHandler.
#   https://vercel.com/docs/functions/runtimes/python/api-directory
#
# PROVIDER: Google Gemini (generativelanguage.googleapis.com). v1 (22 Aug 2026):
# the request shape walks a schema ladder for Gemini 3.x (see LADDER). ONLY
# _gemini_payload / _gemini_call / call_llm and OUTPUT_JSON_SCHEMA differ from
# the reference build; every validator, the ranking and the Supabase I/O are
# provider-agnostic and byte-for-byte what they were.
#
# This file is the ONLY place SUPABASE_SERVICE_ROLE_KEY and LLM_API_KEY exist.
# Neither is ever prefixed VITE_, so neither can reach the client bundle.
#
# Contract (TDD §9.1, PRD §11.1):
#   POST /api/synthesise
#   Authorization: Bearer <supabase anon JWT>
#   { "session_id": "<uuid>" }            ← the ONLY field the client sends
#
# Everything else is read server-side with the service-role key, because a
# client that could assemble other participants' notes would already have
# violated the independence invariant.
#
# Dependencies: NONE. Standard library only (urllib, json, http.server).
# =============================================================================

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

# -----------------------------------------------------------------------------
# Configuration.
#
# Read with .get(), NOT os.environ["..."].  A KeyError at import time makes the
# whole module fail to load, and Vercel then returns an opaque platform 500 with
# no JSON body — the client's error handler gets HTML and shows nothing useful.
# We want a clean JSON 500 that names the missing variable in the server log.
# -----------------------------------------------------------------------------
SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
LLM_API_KEY = os.environ.get("LLM_API_KEY") or ""
# Model IDs are ENV VARS, not constants, precisely so a stale ID is never
# discovered at demo time. Verify the current free-tier id at ai.google.dev.
LLM_MODEL = os.environ.get("LLM_MODEL", "gemini-3.7-flash")

# Same-origin in production (the SPA and the function share a Vercel domain),
# so CORS is belt-and-braces.  Set ALLOWED_ORIGIN to your production URL if you
# ever want to lock it down; "*" is correct while you are also hitting the
# function from `vercel dev` on localhost.
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def gemini_url(model):
    """Key goes in the query string. urllib only — no SDK, no dependency."""
    return f"{GEMINI_BASE}/{urllib.parse.quote(model)}:generateContent"

# Budgets.  vercel.json sets maxDuration: 60 for this function.
# 2 × 25 s LLM attempts + Supabase round-trips must fit inside that with room
# to spare, so we also track a wall-clock budget and refuse to start attempt 2
# if there is not enough time left for it.
# Door B: with exactly one participant, synthesis arms at this many notes.
# Mirrors src/config.js SOLO_NOTE_GATE — keep the two in step.
SOLO_NOTE_GATE = int(os.environ.get("SOLO_NOTE_GATE", "3"))

LLM_TIMEOUT_S = 25          # per attempt
SUPABASE_TIMEOUT_S = 10     # per PostgREST / GoTrue call
TOTAL_BUDGET_S = 50         # leave 10 s of headroom under maxDuration 60

MAX_NOTES = 400             # hard input cap; a demo session has ~30
MAX_BODY_BYTES = 4096       # request body cap — we only ever expect ~60 bytes

# The single user-facing failure string.  Calm, plain, no exclamation mark.
FAIL = "Synthesis didn't complete. Your notes are saved. Try again."

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

# -----------------------------------------------------------------------------
# The schema we send to the model.
#
# THE SCHEMA IS A HINT. THE PYTHON VALIDATOR IS THE CONTRACT.
#
# Gemini's responseSchema is an OpenAPI subset: it does NOT accept
# additionalProperties, it spells types in upper case, it expresses nullable
# as a flag rather than a union type, and keyword support has varied between
# versions.  So the wire schema below is deliberately minimal and the FULL
# PRD §11.3 constraints (lengths, cardinalities, the disagreement-note rule)
# are enforced by validate() below.  That costs nothing: this function never
# trusted the model's output and never trusted its counts.
# -----------------------------------------------------------------------------
OUTPUT_SCHEMA = {
    "type": "OBJECT",
    "required": ["findings"],
    "properties": {
        "findings": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "required": [
                    "theme",
                    "summary",
                    "supporting_note_ids",
                    "has_disagreement",
                    "disagreement_note",
                ],
                "properties": {
                    "theme": {"type": "STRING"},
                    "summary": {"type": "STRING"},
                    "supporting_note_ids": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                    },
                    "has_disagreement": {"type": "BOOLEAN"},
                    "disagreement_note": {"type": "STRING", "nullable": True},
                },
            },
        }
    },
}

# Standard JSON Schema — what Gemini 3 accepts in `responseJsonSchema`. Lowercase
# types, null via a type array, additionalProperties honoured. Lengths and
# cardinalities are deliberately NOT encoded here either: validate() enforces
# them, and a narrower wire schema has fewer ways to be rejected.
OUTPUT_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["findings"],
    "properties": {
        "findings": {
            "type": "array",
            "minItems": 1,
            "maxItems": 12,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "theme",
                    "summary",
                    "supporting_note_ids",
                    "has_disagreement",
                    "disagreement_note",
                ],
                "properties": {
                    "theme": {"type": "string"},
                    "summary": {"type": "string"},
                    "supporting_note_ids": {
                        "type": "array",
                        "minItems": 1,
                        "items": {"type": "string"},
                    },
                    "has_disagreement": {"type": "boolean"},
                    "disagreement_note": {"type": ["string", "null"]},
                },
            },
        }
    },
}

# The shape, restated in words, so the model still knows it when we fall back
# to plain JSON mode (see call_llm).
SCHEMA_HINT = """Return exactly this shape:
{"findings":[{"theme":"string","summary":"string",
"supporting_note_ids":["note id from the input"],
"has_disagreement":true|false,"disagreement_note":"string or null"}]}"""

# The limits validate() enforces (PRD §11.3, TDD §9.2).
THEME_MIN, THEME_MAX = 3, 80
SUMMARY_MIN, SUMMARY_MAX = 10, 400
DISAGREE_MAX = 600
FINDINGS_MAX = 12

# -----------------------------------------------------------------------------
# Prompt — TDD §9.3, verbatim.
# -----------------------------------------------------------------------------
SYSTEM_PROMPT = """You are the synthesis engine for Grove, a research tool.

Several people independently observed the same research session. Each wrote
notes in a private lane and could not see anyone else's notes. You are given
all their notes, each tagged with an opaque note id and an opaque observer id.

Your job is to group notes that describe the SAME underlying observation into
themes.

Rules, all mandatory:
1. Group by MEANING, not by wording. Two observers describing the same moment
   in different words belong to the same theme.
2. Never merge two genuinely different observations to make a theme look
   better supported. Corroboration is the product's core claim; inflating it
   destroys the product.
3. Every note id you cite must appear in the input exactly as given. Never
   invent, alter, or guess a note id.
4. A note may support at most one theme. If it genuinely spans two, pick the
   closer one.
5. Notes that stand alone still become themes with a single supporting note.
   Do NOT discard them and do NOT pad them.
6. If two or more observers recorded CONTRADICTORY accounts of the same
   moment, set has_disagreement to true and state both positions plainly in
   disagreement_note. Do NOT resolve the contradiction, do NOT pick a winner,
   and do NOT average them. Flagging it is the whole job.
7. Write summaries in plain, precise language. No marketing tone. No
   exclamation marks. No emoji. Numbers before adjectives.
8. If the notes do not support a claim, say less. Never fill a gap with
   plausible-sounding content. If you are unsure, leave it out.

Return at most 12 findings. Set disagreement_note to null when
has_disagreement is false.

Return ONLY valid JSON matching the provided schema. No prose, no markdown
fences, no commentary before or after the JSON."""


def build_user_prompt(title, research_question, observer_total, note_lines):
    """TDD §9.3 user message. Observer labels only — never display names."""
    return (
        "RESEARCH QUESTION:\n"
        f"{research_question}\n\n"
        "SESSION TITLE:\n"
        f"{title}\n\n"
        f"OBSERVER COUNT: {observer_total}\n\n"
        "NOTES (each line: note_id | observer_id | kind | body)\n"
        f"{note_lines}\n\n"
        "Group these into themes and return JSON.\n\n"
        f"{SCHEMA_HINT}"
    )


# =============================================================================
# Small HTTP helpers.  urllib only — no third-party dependency, no cold-start
# import cost, nothing to pin.
# =============================================================================


class SupabaseError(Exception):
    """A PostgREST or GoTrue call failed. Never surfaced to the client raw."""


def _request(req, timeout):
    """Perform a urllib request, returning (status, bytes). Raises on transport
    failure. HTTPError is caught and returned so callers can inspect status."""
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def supa(path, method="GET", body=None, prefer="return=representation"):
    """Minimal PostgREST call with the service-role key (bypasses RLS).

    `path` must already be a safe, fully-escaped PostgREST path — every caller
    below builds it from a UUID that passed UUID_RE, so there is no way for
    user input to escape the query string.
    """
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise SupabaseError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    status, raw = _request(req, SUPABASE_TIMEOUT_S)
    if status >= 400:
        # Log server-side only. Provider/database text NEVER reaches the client.
        print(f"[grove] supabase {method} {path} -> {status}: {raw[:400]!r}")
        raise SupabaseError(f"supabase {status}")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise SupabaseError("supabase returned non-JSON")


def auth_user(jwt):
    """Resolve the caller's anonymous user id from their Supabase JWT.

    We do not verify the signature ourselves — GoTrue does it. A forged token
    fails here with 401, which is exactly the behaviour we want.
    """
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        return None
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {jwt}"},
    )
    try:
        status, raw = _request(req, SUPABASE_TIMEOUT_S)
    except Exception as e:  # network / DNS / timeout
        print(f"[grove] auth_user transport error: {e!r}")
        return None
    if status >= 400:
        return None
    try:
        return json.loads(raw).get("id")
    except Exception:
        return None


# =============================================================================
# LLM call + validation
# =============================================================================


class LLMTimeout(Exception):
    pass


class LLMBadOutput(Exception):
    pass


def strip_fences(text):
    """Remove one layer of ``` fencing if the model added it despite the
    instruction. One pass only — no heuristic repair beyond this (PRD §11.5)."""
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else ""
        t = t.rsplit("```", 1)[0]
    return t.strip()


# The schema ladder. Each rung is one request shape; a 400 falls to the next.
# A 400 costs about a second, not a 25 s attempt, so the budget logic in
# do_POST is unchanged. validate() polices the output regardless of rung.
LADDER = ("json_schema", "openapi", "plain")


def _gemini_payload(user_prompt, mode):
    """Gemini generateContent body. `system` is systemInstruction, a top-level
    field — not a message with role "system".

    mode is one rung of LADDER:
      "json_schema" — responseJsonSchema (standard JSON Schema) + LOW thinking
      "openapi"     — responseSchema (the older OpenAPI-subset dialect), no thinkingConfig
      "plain"       — JSON mime type only; SCHEMA_HINT in the prompt carries the shape

    Gemini 3: temperature is left at its default — Google's 3.x guidance warns
    that values below 1.0 can loop or degrade — and thinking is pinned LOW so
    the 25 s budget is spent on the answer, not on a reasoning trace. Older
    models keep the original 0.2.
    """
    generation = {
        "maxOutputTokens": 4000,
        "responseMimeType": "application/json",
    }
    if not LLM_MODEL.startswith("gemini-3"):
        generation["temperature"] = 0.2
    if mode == "json_schema":
        generation["responseJsonSchema"] = OUTPUT_JSON_SCHEMA
        generation["thinkingConfig"] = {"thinkingLevel": "LOW"}
    elif mode == "openapi":
        generation["responseSchema"] = OUTPUT_SCHEMA
    return {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": generation,
    }


def _gemini_call(user_prompt, mode):
    """One request. Returns (status, raw_bytes)."""
    req = urllib.request.Request(
        f"{gemini_url(LLM_MODEL)}?key={urllib.parse.quote(LLM_API_KEY)}",
        method="POST",
        data=json.dumps(_gemini_payload(user_prompt, mode)).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        return _request(req, LLM_TIMEOUT_S)
    except TimeoutError as e:
        # socket.timeout is an alias of TimeoutError on 3.10+, and Vercel's
        # Python runtime is 3.12 by default.
        raise LLMTimeout(str(e))
    except urllib.error.URLError as e:
        # urllib wraps the socket timeout in URLError.reason.
        reason = getattr(e, "reason", None)
        if isinstance(reason, TimeoutError) or "timed out" in str(reason).lower():
            raise LLMTimeout(str(reason))
        raise LLMBadOutput(f"transport: {e}")


def call_llm(user_prompt):
    """One Gemini generateContent call with structured output. 25 s budget.

    The two things that are easy to get wrong:
      - the key goes in the QUERY STRING, not an Authorization header
      - `systemInstruction` is a top-level field, not a message with a role

    A 400 is treated as a schema-dialect rejection and the call walks down
    LADDER: responseJsonSchema → responseSchema → plain JSON. The prompt
    carries SCHEMA_HINT on every rung, so the model knows the shape either
    way, and validate() polices it regardless.
    """
    status, raw = 500, b""
    for i, mode in enumerate(LADDER):
        status, raw = _gemini_call(user_prompt, mode)
        if status != 400 or i == len(LADDER) - 1:
            break
        print(f"[grove] gemini 400 in mode {mode}, trying {LADDER[i + 1]}: {raw[:300]!r}")

    if status >= 400:
        # 429 / 503 are retryable, 401 / 400 are not — but either way the
        # client sees only FAIL. The detail goes to the server log.
        print(f"[grove] gemini -> {status}: {raw[:500]!r}")
        raise LLMBadOutput(f"gemini {status}")

    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        raise LLMBadOutput("gemini returned a non-JSON envelope")

    candidates = body.get("candidates") or []
    if not candidates:
        # A safety block or an empty candidate list both land here.
        print(f"[grove] gemini returned no candidates: {raw[:500]!r}")
        raise LLMBadOutput("no candidates in response")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    # Gemini 3 may return thought parts alongside the answer; only the
    # non-thought text is the answer.
    text = "".join(part.get("text", "") for part in parts if not part.get("thought"))
    if not text.strip():
        raise LLMBadOutput("empty text in response")
    return text


def validate(obj):
    """Enforce PRD §11.3 / TDD §9.2 in full — including the length and
    cardinality limits the wire schema cannot carry.

    The whole response fails or the whole response passes. We never accept the
    valid subset of an invalid response (PRD §11.5).
    """
    if not isinstance(obj, dict):
        raise LLMBadOutput("top level is not an object")
    findings = obj.get("findings")
    if not isinstance(findings, list) or not findings:
        raise LLMBadOutput("no findings")
    if len(findings) > FINDINGS_MAX:
        raise LLMBadOutput(f"more than {FINDINGS_MAX} findings")

    for f in findings:
        if not isinstance(f, dict):
            raise LLMBadOutput("finding is not an object")

        theme = f.get("theme")
        if not isinstance(theme, str) or not THEME_MIN <= len(theme.strip()) <= THEME_MAX:
            raise LLMBadOutput("bad theme")

        summary = f.get("summary")
        if not isinstance(summary, str) or not SUMMARY_MIN <= len(summary.strip()) <= SUMMARY_MAX:
            raise LLMBadOutput("bad summary")

        ids = f.get("supporting_note_ids")
        if not isinstance(ids, list) or not ids or not all(isinstance(i, str) for i in ids):
            raise LLMBadOutput("bad supporting_note_ids")

        flag = f.get("has_disagreement")
        if not isinstance(flag, bool):
            raise LLMBadOutput("bad has_disagreement")

        note = f.get("disagreement_note")
        if note is not None and not isinstance(note, str):
            raise LLMBadOutput("bad disagreement_note type")
        if isinstance(note, str) and len(note) > DISAGREE_MAX:
            raise LLMBadOutput("disagreement_note too long")
        # has_disagreement true with nothing to say is a FAILURE, not something
        # we quietly coerce to false (PRD §11.5).
        if flag and not (note or "").strip():
            raise LLMBadOutput("disagreement without note")

    return obj


# =============================================================================
# The handler
# =============================================================================


class handler(BaseHTTPRequestHandler):
    # Silence the default stderr access log; we log what we care about.
    def log_message(self, fmt, *args):
        pass

    # ---- response helpers ---------------------------------------------------

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Vary", "Origin")

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _fail(self, status, code, message=FAIL):
        self._send(status, {"ok": False, "code": code, "message": message})

    # ---- methods ------------------------------------------------------------

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # A GET here is almost always a human or a probe. Answer honestly.
        # It is also how you verify the SPA rewrite is NOT swallowing /api/*:
        # this must return JSON, not index.html.
        self._send(405, {"ok": False, "code": "METHOD_NOT_ALLOWED",
                         "message": "POST { session_id } to this endpoint."})

    def do_POST(self):
        started = time.monotonic()

        def remaining():
            return TOTAL_BUDGET_S - (time.monotonic() - started)

        # --- 0. environment sanity ------------------------------------------
        missing = [n for n, v in (
            ("SUPABASE_URL", SUPABASE_URL),
            ("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY),
            ("LLM_API_KEY", LLM_API_KEY),
        ) if not v]
        if missing:
            print(f"[grove] missing env vars: {missing}")
            return self._fail(500, "INTERNAL")

        # --- 1. read and validate the request body --------------------------
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length > MAX_BODY_BYTES:
            return self._fail(400, "BAD_REQUEST",
                              "Something went wrong with that request. Your notes are saved.")
        try:
            raw = self.rfile.read(length) if length else b"{}"
            payload = json.loads(raw or b"{}")
            session_id = payload.get("session_id") if isinstance(payload, dict) else None
        except Exception:
            session_id = None

        # A UUID check is not cosmetic: session_id is interpolated into a
        # PostgREST query string below. Anything that is not a plain UUID is
        # rejected here rather than escaped later.
        if not isinstance(session_id, str) or not UUID_RE.match(session_id):
            return self._fail(400, "BAD_REQUEST",
                              "Something went wrong with that request. Your notes are saved.")
        sid = urllib.parse.quote(session_id, safe="")

        # --- 2. authenticate the caller -------------------------------------
        auth_header = self.headers.get("Authorization") or ""
        jwt = auth_header[7:].strip() if auth_header[:7].lower() == "bearer " else ""
        uid = auth_user(jwt) if jwt else None
        if not uid:
            return self._fail(401, "UNAUTHORISED", "Your session expired. Reload the page.")

        try:
            # --- 3. authorise: caller must be a participant of THIS session --
            me = supa(
                f"/rest/v1/participants?session_id=eq.{sid}"
                f"&user_id=eq.{urllib.parse.quote(uid, safe='')}&select=id"
            )
            if not me:
                return self._fail(403, "NOT_A_PARTICIPANT",
                                  "You are not a participant of this session.")

            # --- 4. read the session and every lane (service role bypasses RLS)
            sessions = supa(
                f"/rest/v1/sessions?id=eq.{sid}&select=id,title,research_question"
            )
            if not sessions:
                return self._fail(404, "SESSION_NOT_FOUND", FAIL)
            session = sessions[0]

            participants = supa(
                f"/rest/v1/participants?session_id=eq.{sid}"
                "&select=id,joined_at&order=joined_at.asc"
            ) or []

            notes = supa(
                f"/rest/v1/notes?session_id=eq.{sid}"
                "&select=id,participant_id,kind,body&order=created_at.asc"
                f"&limit={MAX_NOTES}"
            ) or []

        except SupabaseError:
            return self._fail(500, "INTERNAL")
        except Exception as e:
            print(f"[grove] unexpected read error: {e!r}")
            return self._fail(500, "INTERNAL")

        # --- 5. the synthesis precondition ----------------------------------
        # Door A (the session): Grove's claim is "N distinct observers
        # independently noted this", so two lanes are required — with one lane
        # there is nothing to corroborate.
        #
        # Door B (the notebook, GROVE-MASTER.md §1.4 and S10): one person may
        # synthesise their OWN notes once there are enough of them to group.
        # Nothing about that path is dressed up to look corroborated — every
        # badge reads "1 of 1 observer", in the grey ladder step. Grove does
        # not tell you your own notes agree with you.
        with_notes = {n["participant_id"] for n in notes}
        if len(with_notes) == 1 and len(notes) < SOLO_NOTE_GATE:
            return self._fail(409, "TOO_FEW_NOTES",
                              f"Synthesis needs at least {SOLO_NOTE_GATE} notes.")
        if not with_notes:
            return self._fail(409, "TOO_FEW_OBSERVERS",
                              "Synthesis needs at least one observer with notes.")

        # --- 6. anonymised observer labels ----------------------------------
        # "Observer 1..N" by joined_at ascending (PRD FR-31). Display names and
        # participant uuids are NEVER sent to the model. It has no need for
        # identity, so it does not get identity.
        ordered = [p["id"] for p in participants if p["id"] in with_notes]
        for pid in with_notes:                       # defensive: a note whose
            if pid not in ordered:                   # participant row vanished
                ordered.append(pid)
        label = {pid: f"Observer {i + 1}" for i, pid in enumerate(ordered)}

        # owner maps note id -> participant id. THIS is what makes the count
        # ours rather than the model's.
        owner = {n["id"]: n["participant_id"] for n in notes}

        note_lines = "\n".join(
            "{} | {} | {} | {}".format(
                n["id"],
                label[n["participant_id"]],
                n.get("kind") or "observation",
                " ".join((n.get("body") or "").split()),   # collapse whitespace
            )
            for n in notes
        )
        user_prompt = build_user_prompt(
            session.get("title") or "",
            session.get("research_question") or "",
            len(with_notes),
            note_lines,
        )

        # --- 7. one LLM call, 25 s budget, one full retry on bad output ------
        # A timeout NEVER burns the retry: if the model is slow, a second
        # 25 s attempt risks the platform ceiling and gives the observer a
        # 60 s wait for the same failure.
        parsed, timed_out = None, False
        for attempt in (1, 2):
            if attempt == 2 and remaining() < LLM_TIMEOUT_S + 5:
                print("[grove] skipping retry: not enough budget left")
                break
            try:
                text = call_llm(user_prompt)
                parsed = validate(json.loads(strip_fences(text)))
                break
            except LLMTimeout as e:
                print(f"[grove] llm timeout on attempt {attempt}: {e}")
                timed_out = True
                break
            except (LLMBadOutput, json.JSONDecodeError) as e:
                print(f"[grove] llm bad output on attempt {attempt}: {e}")
                continue
            except Exception as e:
                print(f"[grove] llm unexpected error on attempt {attempt}: {e!r}")
                continue

        if parsed is None:
            return self._fail(504 if timed_out else 422,
                              "LLM_TIMEOUT" if timed_out else "LLM_BAD_JSON")

        # --- 8. WE compute observer_count and rank. Not the model. ----------
        # This is the part a judge will ask about. The model returns which note
        # ids support a theme; the arithmetic on those ids is ours, performed
        # on data we own. A hallucinated id cannot inflate a count because it
        # is discarded before the count is taken.
        enriched = []
        dropped_ids = 0
        for order, f in enumerate(parsed["findings"]):
            valid_ids = []
            seen = set()
            for i in f["supporting_note_ids"]:
                if i in owner and i not in seen:      # real id, no duplicates
                    seen.add(i)
                    valid_ids.append(i)
                elif i not in owner:
                    dropped_ids += 1

            if not valid_ids:
                # Ranking rule 2: a finding with no surviving evidence is not a
                # finding. Discard it silently — it never reaches the observer.
                continue

            enriched.append({
                "session_id": session_id,
                "theme": f["theme"].strip(),
                "summary": f["summary"].strip(),
                "supporting_note_ids": valid_ids,
                # DISTINCT participants, not notes. Three notes from one
                # observer is corroboration of one.
                "observer_count": len({owner[i] for i in valid_ids}),
                "has_disagreement": bool(f["has_disagreement"]),
                "disagreement_note": (f.get("disagreement_note") or "").strip() or None,
                "_order": order,
            })

        if dropped_ids:
            print(f"[grove] discarded {dropped_ids} hallucinated note id(s)")

        if not enriched:
            # Every finding discarded by ranking rules 1–2 → failure (PRD §11.5).
            return self._fail(422, "LLM_BAD_JSON")

        # A disagreement flag that survived id-validation must still have text;
        # re-check after the strip() above, because " " strips to None.
        for f in enriched:
            if f["has_disagreement"] and not f["disagreement_note"]:
                print("[grove] disagreement flag lost its note after trimming")
                return self._fail(422, "LLM_BAD_JSON")

        # PRD §11.4 ordering, in this exact order:
        #   1. observer_count DESC        — corroboration is the product
        #   2. supporting-note count DESC — more evidence outranks less
        #   3. has_disagreement TRUE first — a contested finding at the same
        #      corroboration level is more useful to see
        #   4. the model's own order      — stable within a run
        enriched.sort(key=lambda f: (
            -f["observer_count"],
            -len(f["supporting_note_ids"]),
            not f["has_disagreement"],
            f["_order"],
        ))
        for i, f in enumerate(enriched):
            f["rank"] = i + 1
            del f["_order"]

        # --- 9. replace prior findings, write the new set -------------------
        # Re-synthesis replaces; it never appends. `findings_rank_uniq` would
        # reject a second set anyway, which is the constraint doing its job.
        try:
            supa(f"/rest/v1/findings?session_id=eq.{sid}", method="DELETE", prefer=None)
            written = supa("/rest/v1/findings", method="POST", body=enriched) or []
            supa(f"/rest/v1/sessions?id=eq.{sid}", method="PATCH",
                 body={"status": "synthesised"})
        except SupabaseError:
            return self._fail(500, "INTERNAL")
        except Exception as e:
            print(f"[grove] unexpected write error: {e!r}")
            return self._fail(500, "INTERNAL")

        elapsed = round(time.monotonic() - started, 2)
        print(f"[grove] synthesised session={session_id} "
              f"observers={len(with_notes)} findings={len(written)} in {elapsed}s")

        return self._send(200, {
            "ok": True,
            "session_id": session_id,
            "observer_total": len(with_notes),
            "findings": sorted(written, key=lambda f: f.get("rank", 0)),
        })
