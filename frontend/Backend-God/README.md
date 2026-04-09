# Backend-God Skill

**Version:** 1.0  
**Created:** April 2026  
**Project:** Thunder Gaming Cafe — Thunder Management  

---

## What This Skill Does

Backend-God is a specialized AI skill that makes fixing, debugging, and optimizing the Thunder Management backend fast and reliable. Instead of searching through 1000+ line files every time something breaks, this skill provides:

- A complete mental model of every controller, service, route, and utility
- Pre-mapped bug-to-file lookup tables
- 10 encoded critical rules (safety checks, anti-patterns, known gotchas)
- Instant reference for all Firestore collections and their schemas
- Step-by-step fix protocol with mandatory safety verification

---

## Folder Structure

```
Backend-God/
├── SKILL-bg.md              ← Main skill file (load this to activate)
├── README.md                ← This file
├── LICENSE.txt
├── agents/
│   ├── grader.md            ← How to evaluate a backend fix
│   ├── analyzer.md          ← How to analyze patterns across evals
│   └── comparator.md        ← How to do blind A/B comparison of fixes
├── references/
│   ├── schemas.md           ← JSON schemas for evals/grading/benchmark
│   └── codebase-map.md      ← Fast lookup: bug → file, exports, one-liners
├── evals/
│   └── evals.json           ← 5 test cases covering critical bug categories
└── scripts/
    ├── quick_validate.py    ← Run 5 safety checks on any modified JS file
    ├── check_coverage.py    ← Report which bug categories are covered by evals
    └── aggregate_benchmark.py ← Aggregate grading results into benchmark.json
```

---

## How to Use

### To Fix a Backend Bug
Load `SKILL-bg.md` and describe the bug. The skill will:
1. Map the error to the right file
2. Read the file
3. Make a surgical fix
4. Verify all 8 safety checks before finishing

### To Validate a Fix Manually
```bash
python Backend-God/scripts/quick_validate.py path/to/modified-controller.js
```

### To Check Eval Coverage
```bash
python Backend-God/scripts/check_coverage.py
```

### To Run and Grade an Eval
Provide the eval prompt from `evals/evals.json` to the agent with `SKILL-bg.md` loaded,
then use `agents/grader.md` to evaluate the output.

### To Aggregate Benchmark Results
```bash
python Backend-God/scripts/aggregate_benchmark.py workspace/iteration-1 --skill-name Backend-God
```

---

## Bug Categories Covered by Evals

| Category | Eval Name |
|---|---|
| thundercoin-atomic | thundercoin-atomic-fix |
| pricing-ist | ist-pricing-timezone-fix |
| booking-conversion | booking-not-converting |
| snack-transaction | snack-deduction-crash |
| analytics-reads | analytics-duplicate-reads |

Missing coverage: `session-logic`, `auth-firebase`, `socket-crash`, `device-format`, `null-safety`  
Add these to `evals/evals.json` when needed.

---

## Backend Stack Reference

- **Runtime:** Node.js (Express 5)
- **Database:** Firebase Firestore (Admin SDK v10)
- **Auth:** Firebase Authentication (JWT via Bearer token)
- **Real-time:** Socket.IO v4
- **Deployment:** Render (UTC timezone — IST offset needed for pricing)
- **Frontend:** React + TypeScript + Vite (deployed on Vercel)
