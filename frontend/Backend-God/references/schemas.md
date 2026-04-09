# Backend-God JSON Schemas

This document defines the JSON structures used by the Backend-God skill for evals, grading, benchmarking, and analysis.

---

## evals.json

Defines the test cases for the Backend-God skill. Located at `evals/evals.json`.

```json
{
  "skill_name": "Backend-God",
  "evals": [
    {
      "id": 1,
      "name": "thundercoin-atomic-fix",
      "prompt": "The ThunderCoin deduction in createSession is not atomic. Two simultaneous session creations for the same phone number cause coin double-spend. Fix it.",
      "expected_output": "sessionController.js updated to use FieldValue.increment(-safeDeduction) instead of currentCoins - safeDeduction",
      "target_file": "backend/src/controllers/sessionController.js",
      "target_function": "createSession",
      "files": [],
      "expectations": [
        "The fix uses admin.firestore.FieldValue.increment(-safeDeduction)",
        "No get()-then-update() pattern remains for the thunderCoins field",
        "module.exports in sessionController.js is still intact",
        "The global.io.emit call after the fix is guarded with if (global.io)"
      ]
    }
  ]
}
```

**Fields:**
- `skill_name`: Must be `"Backend-God"`
- `evals[].id`: Unique integer identifier
- `evals[].name`: Descriptive slug (used as directory name in workspace)
- `evals[].prompt`: The bug description / fix request — written as a real user would describe it
- `evals[].expected_output`: Human-readable description of success
- `evals[].target_file`: The primary file expected to be modified
- `evals[].target_function`: The specific function expected to be modified (optional)
- `evals[].files`: Optional input files to include with the eval
- `evals[].expectations`: Verifiable assertions for the grader

---

## Bug Category Tags

Use these tags in eval prompts (and grading notes) to group eval results by domain:

| Tag | Maps to Skill Section |
|---|---|
| `session-logic` | sessionController createSession, updateSession, completeSession |
| `booking-conversion` | convertBookingsToSessions, startBooking, bookingScheduler |
| `pricing-ist` | utils/pricing.js — IST timezone, time window calculation |
| `thundercoin-atomic` | battleController.finishBattle, sessionController ThunderCoin deduction |
| `analytics-reads` | analyticsController — read consolidation, getDashboardData |
| `auth-firebase` | auth.middleware.js, config/firebase.js |
| `snack-transaction` | services/snackService.js, snackController |
| `socket-crash` | global.io guards across all controllers |
| `device-format` | transformDevicesToArray, legacy number vs array IDs |
| `null-safety` | Missing field guards on Firestore data |

---

## grading.json

Output from the grader agent. Located at `<run-dir>/grading.json`.

```json
{
  "expectations": [
    {
      "text": "The fix uses admin.firestore.FieldValue.increment(-safeDeduction)",
      "passed": true,
      "evidence": "Line 204 of sessionController.js: thunderCoins: admin.firestore.FieldValue.increment(-safeDeduction)"
    },
    {
      "text": "No get()-then-update() pattern remains for the thunderCoins field",
      "passed": false,
      "evidence": "Lines 196-206 still contain playerSnap = await playerRef.get() followed by update — the increment was added but the stale read was not removed"
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 1,
    "total": 2,
    "pass_rate": 0.50
  },
  "safety_check_results": [
    {
      "check": "db_null_guard",
      "passed": true,
      "evidence": "Function begins with if (!db) return res.status(500)..."
    },
    {
      "check": "io_guard",
      "passed": false,
      "evidence": "global.io.emit('session:started', ...) at line 217 has no if (global.io) wrapper"
    },
    {
      "check": "module_exports_intact",
      "passed": true,
      "evidence": "All 12 original exports still present in module.exports block"
    },
    {
      "check": "no_pricing_loop",
      "passed": true,
      "evidence": "getPricingConfig() called once at line 135, not inside any loop"
    },
    {
      "check": "atomic_increment",
      "passed": false,
      "evidence": "ThunderCoin field still uses read-then-write pattern despite adding increment"
    },
    {
      "check": "transactions_for_stock",
      "passed": true,
      "evidence": "snackService.deductStock still wrapped in db.runTransaction"
    },
    {
      "check": "timestamp_safety",
      "passed": true,
      "evidence": "All bookingTime accesses use b.bookingTime?.toDate ? b.bookingTime.toDate() : new Date(b.bookingTime)"
    },
    {
      "check": "try_catch",
      "passed": true,
      "evidence": "Modified code is inside existing try/catch block"
    }
  ],
  "execution_metrics": {
    "files_read": 3,
    "files_modified": 1,
    "errors_encountered": 0
  },
  "eval_feedback": {
    "suggestions": [
      {
        "assertion": "No get()-then-update() pattern remains",
        "reason": "The current assertion checks only that increment is used, but doesn't check that the stale read was also removed — both must be changed together for the fix to be truly atomic"
      }
    ],
    "overall": "Good assertions but the atomicity check should be more specific about the full read-then-write pattern."
  }
}
```

---

## timing.json

Wall clock timing for a run. Located at `<run-dir>/timing.json`.

Capture this from the task notification immediately when the subagent completes — it is not persisted elsewhere.

```json
{
  "total_tokens": 42500,
  "duration_ms": 18200,
  "total_duration_seconds": 18.2,
  "executor_start": "2026-04-09T17:00:00Z",
  "executor_end": "2026-04-09T17:00:18Z",
  "executor_duration_seconds": 18.2,
  "grader_start": "2026-04-09T17:00:19Z",
  "grader_end": "2026-04-09T17:00:35Z",
  "grader_duration_seconds": 16.0
}
```

---

## benchmark.json

Output from aggregated benchmark runs. Located at `<workspace>/iteration-N/benchmark.json`.

```json
{
  "metadata": {
    "skill_name": "Backend-God",
    "skill_path": "frontend/Backend-God/SKILL-bg.md",
    "timestamp": "2026-04-09T17:00:00Z",
    "evals_run": ["thundercoin-atomic-fix", "ist-pricing-fix", "booking-conversion-bug"],
    "runs_per_configuration": 2
  },
  "runs": [
    {
      "eval_id": 1,
      "eval_name": "thundercoin-atomic-fix",
      "configuration": "with_skill",
      "run_number": 1,
      "result": {
        "pass_rate": 0.75,
        "passed": 3,
        "failed": 1,
        "total": 4,
        "time_seconds": 18.2,
        "tokens": 42500,
        "tool_calls": 12,
        "errors": 0
      },
      "expectations": [
        {"text": "The fix uses FieldValue.increment", "passed": true, "evidence": "..."},
        {"text": "No stale read remains", "passed": false, "evidence": "..."}
      ]
    }
  ],
  "run_summary": {
    "with_skill": {
      "pass_rate": {"mean": 0.80, "stddev": 0.10, "min": 0.70, "max": 0.90},
      "time_seconds": {"mean": 22.0, "stddev": 5.0, "min": 16.0, "max": 30.0},
      "tokens": {"mean": 40000, "stddev": 5000, "min": 34000, "max": 48000}
    },
    "without_skill": {
      "pass_rate": {"mean": 0.30, "stddev": 0.15, "min": 0.10, "max": 0.50},
      "time_seconds": {"mean": 35.0, "stddev": 10.0, "min": 22.0, "max": 48.0},
      "tokens": {"mean": 65000, "stddev": 8000, "min": 55000, "max": 75000}
    },
    "delta": {
      "pass_rate": "+0.50",
      "time_seconds": "-13.0",
      "tokens": "-25000"
    }
  },
  "notes": [
    "IST pricing fix evals pass 100% with skill vs 0% without — timezone section is highly effective",
    "ThunderCoin atomic evals have 50% pass rate with skill — the stale read is still not being removed",
    "Without-skill runs use 60% more tokens due to re-reading all files without guidance",
    "Socket.IO guard safety check fails in 2/4 with-skill runs — promote this rule higher in SKILL-bg.md"
  ]
}
```

**Important:** The `configuration` field must be exactly `"with_skill"` or `"without_skill"`. The `result` object must be nested (not flat). Field names are used verbatim by any benchmark viewer.

---

## Safety Check Results Schema

Used inside `grading.json` under `safety_check_results`.

```json
[
  { "check": "db_null_guard",         "passed": true,  "evidence": "..." },
  { "check": "io_guard",              "passed": false, "evidence": "..." },
  { "check": "module_exports_intact", "passed": true,  "evidence": "..." },
  { "check": "no_pricing_loop",       "passed": true,  "evidence": "..." },
  { "check": "atomic_increment",      "passed": true,  "evidence": "..." },
  { "check": "transactions_for_stock","passed": true,  "evidence": "..." },
  { "check": "timestamp_safety",      "passed": true,  "evidence": "..." },
  { "check": "try_catch",             "passed": true,  "evidence": "..." }
]
```

All 8 checks are **mandatory** in every grading run. Missing checks must be reported as `"passed": false` with `"evidence": "Not verified — check was skipped."`.
