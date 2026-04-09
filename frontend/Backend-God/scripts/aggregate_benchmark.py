#!/usr/bin/env python3
"""
Backend-God: Aggregate Benchmark Results
==========================================
Aggregates individual grading.json files from a benchmark workspace
into a single benchmark.json with statistics per configuration.

Usage:
    python scripts/aggregate_benchmark.py <workspace/iteration-N> --skill-name Backend-God

Output:
    <workspace/iteration-N>/benchmark.json
    <workspace/iteration-N>/benchmark.md  (human-readable summary)
"""

import json
import sys
import math
import argparse
from pathlib import Path
from datetime import datetime


def mean(values):
    return sum(values) / len(values) if values else 0.0


def stddev(values):
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def load_grading(run_dir: Path) -> dict | None:
    grading_path = run_dir / "grading.json"
    if not grading_path.exists():
        return None
    with open(grading_path) as f:
        return json.load(f)


def load_timing(run_dir: Path) -> dict | None:
    timing_path = run_dir / "timing.json"
    if not timing_path.exists():
        return None
    with open(timing_path) as f:
        return json.load(f)


def collect_runs(workspace: Path) -> list[dict]:
    """Collect all run results from workspace/iteration-N directories."""
    runs = []
    
    for eval_dir in sorted(workspace.iterdir()):
        if not eval_dir.is_dir() or eval_dir.name.startswith('.'):
            continue
        
        for config_dir in sorted(eval_dir.iterdir()):
            if not config_dir.is_dir():
                continue
            
            config_name = config_dir.name  # 'with_skill' or 'without_skill'
            if config_name not in ('with_skill', 'without_skill'):
                continue
            
            grading = load_grading(config_dir)
            timing = load_timing(config_dir)
            
            if not grading:
                continue
            
            summary = grading.get("summary", {})
            run = {
                "eval_name": eval_dir.name,
                "configuration": config_name,
                "run_number": 1,
                "result": {
                    "pass_rate": summary.get("pass_rate", 0.0),
                    "passed": summary.get("passed", 0),
                    "failed": summary.get("failed", 0),
                    "total": summary.get("total", 0),
                    "time_seconds": timing.get("total_duration_seconds", 0.0) if timing else 0.0,
                    "tokens": timing.get("total_tokens", 0) if timing else 0,
                    "errors": grading.get("execution_metrics", {}).get("errors_encountered", 0),
                },
                "expectations": grading.get("expectations", []),
                "safety_checks": grading.get("safety_check_results", []),
            }
            runs.append(run)
    
    return runs


def aggregate_by_config(runs: list[dict]) -> dict:
    configs = {}
    for run in runs:
        cfg = run["configuration"]
        if cfg not in configs:
            configs[cfg] = {"pass_rates": [], "times": [], "tokens": []}
        r = run["result"]
        configs[cfg]["pass_rates"].append(r["pass_rate"])
        configs[cfg]["times"].append(r["time_seconds"])
        configs[cfg]["tokens"].append(r["tokens"])
    
    summaries = {}
    for cfg, data in configs.items():
        summaries[cfg] = {
            "pass_rate": {
                "mean": round(mean(data["pass_rates"]), 3),
                "stddev": round(stddev(data["pass_rates"]), 3),
                "min": round(min(data["pass_rates"]), 3),
                "max": round(max(data["pass_rates"]), 3),
            },
            "time_seconds": {
                "mean": round(mean(data["times"]), 1),
                "stddev": round(stddev(data["times"]), 1),
                "min": round(min(data["times"]), 1),
                "max": round(max(data["times"]), 1),
            },
            "tokens": {
                "mean": round(mean(data["tokens"])),
                "stddev": round(stddev(data["tokens"])),
                "min": round(min(data["tokens"])),
                "max": round(max(data["tokens"])),
            },
        }
    
    return summaries


def compute_delta(summaries: dict) -> dict:
    if "with_skill" not in summaries or "without_skill" not in summaries:
        return {}
    ws = summaries["with_skill"]
    wos = summaries["without_skill"]
    
    def delta_str(a, b):
        diff = round(a - b, 3)
        return f"+{diff}" if diff >= 0 else str(diff)
    
    return {
        "pass_rate": delta_str(ws["pass_rate"]["mean"], wos["pass_rate"]["mean"]),
        "time_seconds": delta_str(ws["time_seconds"]["mean"], wos["time_seconds"]["mean"]),
        "tokens": delta_str(ws["tokens"]["mean"], wos["tokens"]["mean"]),
    }


def write_markdown(benchmark: dict, output_path: Path):
    md = ["# Backend-God Benchmark Summary\n"]
    md.append(f"**Generated:** {benchmark['metadata']['timestamp']}\n")
    md.append(f"**Skill:** {benchmark['metadata']['skill_name']}\n")
    md.append(f"**Evals:** {', '.join(benchmark['metadata']['evals_run'])}\n\n")
    
    md.append("## Results by Configuration\n\n")
    for cfg, data in benchmark["run_summary"].items():
        md.append(f"### {cfg}\n")
        md.append(f"- Pass Rate: {data['pass_rate']['mean']:.0%} ± {data['pass_rate']['stddev']:.0%}\n")
        md.append(f"- Time: {data['time_seconds']['mean']:.1f}s ± {data['time_seconds']['stddev']:.1f}s\n")
        md.append(f"- Tokens: {data['tokens']['mean']:,} ± {data['tokens']['stddev']:,}\n\n")
    
    if benchmark.get("delta"):
        md.append("## Delta (with_skill vs without_skill)\n\n")
        d = benchmark["delta"]
        md.append(f"- Pass Rate: {d.get('pass_rate', 'N/A')}\n")
        md.append(f"- Time: {d.get('time_seconds', 'N/A')}s\n")
        md.append(f"- Tokens: {d.get('tokens', 'N/A')}\n\n")
    
    if benchmark.get("notes"):
        md.append("## Analyst Notes\n\n")
        for note in benchmark["notes"]:
            md.append(f"- {note}\n")
    
    output_path.write_text("".join(md), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Aggregate Backend-God benchmark results")
    parser.add_argument("workspace", help="Path to iteration directory (e.g., workspace/iteration-1)")
    parser.add_argument("--skill-name", default="Backend-God")
    parser.add_argument("--notes", nargs="*", default=[], help="Analyst notes to include")
    args = parser.parse_args()
    
    workspace = Path(args.workspace)
    if not workspace.exists():
        print(f"ERROR: Workspace not found: {workspace}")
        sys.exit(1)
    
    runs = collect_runs(workspace)
    if not runs:
        print(f"ERROR: No grading.json files found under {workspace}")
        sys.exit(1)
    
    summaries = aggregate_by_config(runs)
    delta = compute_delta(summaries)
    eval_names = sorted(set(r["eval_name"] for r in runs))
    
    benchmark = {
        "metadata": {
            "skill_name": args.skill_name,
            "skill_path": "frontend/Backend-God/SKILL-bg.md",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "evals_run": eval_names,
            "runs_per_configuration": max(
                sum(1 for r in runs if r["configuration"] == "with_skill"),
                sum(1 for r in runs if r["configuration"] == "without_skill"),
                1
            ),
        },
        "runs": runs,
        "run_summary": summaries,
        "delta": delta,
        "notes": args.notes,
    }
    
    out_json = workspace / "benchmark.json"
    out_md = workspace / "benchmark.md"
    
    with open(out_json, "w") as f:
        json.dump(benchmark, f, indent=2)
    
    write_markdown(benchmark, out_md)
    
    print(f"✅ benchmark.json → {out_json}")
    print(f"✅ benchmark.md   → {out_md}")
    print(f"\n📊 Summary:")
    for cfg, data in summaries.items():
        print(f"  {cfg}: {data['pass_rate']['mean']:.0%} pass rate")
    if delta:
        print(f"\n  Δ Pass Rate: {delta.get('pass_rate', 'N/A')}")


if __name__ == "__main__":
    main()
