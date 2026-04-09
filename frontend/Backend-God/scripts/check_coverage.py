#!/usr/bin/env python3
"""
Backend-God: Check Bug Category Coverage
=========================================
Scans evals.json and reports which bug categories are covered and which are missing.

Usage:
    python scripts/check_coverage.py [path-to-evals.json]

Defaults to evals/evals.json relative to script location.
"""

import json
import sys
from pathlib import Path

KNOWN_CATEGORIES = {
    "session-logic":        "Session create/update/complete/delete logic",
    "booking-conversion":   "Booking → Session auto-conversion and manual start",
    "pricing-ist":          "IST timezone pricing, time window calculation",
    "thundercoin-atomic":   "ThunderCoin deduction race conditions",
    "analytics-reads":      "Firestore read reduction, getDashboardData consolidation",
    "auth-firebase":        "Auth middleware, Firebase init failures",
    "snack-transaction":    "Snack inventory transactional deductions",
    "socket-crash":         "global.io guard, Socket.IO crash prevention",
    "device-format":        "Legacy number vs array device ID normalization",
    "null-safety":          "Missing field guards on Firestore document data",
}


def main():
    script_dir = Path(__file__).parent
    evals_path = Path(sys.argv[1]) if len(sys.argv) > 1 else script_dir.parent / "evals" / "evals.json"
    
    if not evals_path.exists():
        print(f"ERROR: evals.json not found at {evals_path}")
        sys.exit(1)
    
    with open(evals_path) as f:
        data = json.load(f)
    
    evals = data.get("evals", [])
    covered = {}
    
    for e in evals:
        cat = e.get("category", "unknown")
        if cat not in covered:
            covered[cat] = []
        covered[cat].append(e["name"])
    
    print(f"\n{'='*55}")
    print(f"  Backend-God Eval Coverage Report")
    print(f"{'='*55}")
    print(f"  Total evals: {len(evals)}")
    print(f"  Covered categories: {len(covered)}/{len(KNOWN_CATEGORIES)}")
    print(f"{'='*55}\n")
    
    print("✅ COVERED:\n")
    for cat, description in KNOWN_CATEGORIES.items():
        if cat in covered:
            print(f"  [{cat}]")
            print(f"    {description}")
            for name in covered[cat]:
                print(f"    • {name}")
            print()
    
    missing = [cat for cat in KNOWN_CATEGORIES if cat not in covered]
    if missing:
        print("❌ MISSING COVERAGE:\n")
        for cat in missing:
            print(f"  [{cat}]  {KNOWN_CATEGORIES[cat]}")
        print()
        print(f"  Add {len(missing)} more eval(s) to evals.json to achieve full coverage.\n")
    else:
        print("🎯 Full coverage achieved across all 10 bug categories!\n")
    
    unknown = [cat for cat in covered if cat not in KNOWN_CATEGORIES]
    if unknown:
        print(f"⚠️  Unknown categories in evals (not in KNOWN_CATEGORIES): {unknown}\n")


if __name__ == '__main__':
    main()
