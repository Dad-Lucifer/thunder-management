# Backend-God — Analyzer Agent

Analyze backend fix results to understand patterns, surface regressions, and generate actionable improvement suggestions for the Backend-God skill.

## Role

After the grader evaluates individual fix attempts, the Analyzer looks at results **across multiple evals** to find patterns: where does the skill consistently succeed? Where does it fail? What instructions in SKILL-bg.md are working? What's missing?

---

## Inputs

- **benchmark_data_path**: Path to the in-progress `benchmark.json` with all run results
- **skill_path**: Path to `Backend-God/SKILL-bg.md`
- **output_path**: Where to save the notes (JSON array of strings)

---

## Process

### Step 1: Read Benchmark Data

1. Read `benchmark.json` — note configurations tested, pass rates, and individual run results
2. Identify which evals consistently pass and which consistently fail

### Step 2: Analyze Per-Assertion Patterns

For each expectation across all runs:

| Pattern | Meaning |
|---|---|
| Always passes in both configs | May not discriminate skill value |
| Always fails in both configs | Bug type is beyond current skill guidance |
| Passes with skill, fails without | Skill is clearly providing value here |
| Fails with skill, passes without | Skill instruction is actively harmful |
| High variance | Non-deterministic behavior or ambiguous instruction |

### Step 3: Analyze Bug Category Coverage

Group results by bug category (from the error map in SKILL-bg.md):

- Session logic bugs
- Pricing / IST timezone bugs
- Booking conversion bugs
- ThunderCoin / race condition bugs
- Analytics read optimization bugs
- Auth / Firebase init bugs
- Snack transaction bugs
- Socket.IO crash bugs

For each category: is the skill providing good guidance? Are fixes consistently correct?

### Step 4: Identify Instruction Gaps

Look for patterns where the agent:
- Reads the wrong file first (instruction scope is unclear)
- Misses a safety check (not prominent enough in SKILL-bg.md)
- Introduces a new bug while fixing (skill lacks "don't break X while fixing Y" patterns)
- Re-fetches pricing config unnecessarily (optimization guidance not being followed)

### Step 5: Generate Notes

Write freeform observations as a list of strings. Each note should:
- State a specific pattern observed in the data
- Reference specific evals or assertions
- Help improve either the skill instructions or the eval set

Example notes:
- "IST timezone bug evals consistently pass with skill — the IST section in SKILL-bg.md is effective"
- "ThunderCoin atomic fix evals have 60% variance — the FieldValue.increment guidance may need a clearer code example"
- "Socket.IO guard safety check fails in 3/5 runs even with skill — the rule needs to be more prominent"
- "All without-skill runs fail the 'module.exports intact' check — agents consistently forget exports without guidance"
- "Booking conversion bug fix takes 2x longer than session bugs — may need clearer scope identification guidance"

### Step 6: Write Notes

Save to `{output_path}` as a JSON array of strings.

---

## For Blind Comparison Analysis

When comparing two versions of Backend-God skill, also examine:

### Winner Strengths to Look For
- Clearer file-to-bug mapping (the error type table)
- More prominent safety check rules
- Better code examples for atomic operations
- Explicit "don't do X" anti-patterns

### Loser Weaknesses to Look For
- Vague scope identification (agent reads wrong file)
- Missing IST offset guidance
- No explicit `module.exports` preservation rule
- Missing transaction guidance for snack deduction

### Improvement Suggestion Format

```json
{
  "priority": "high",
  "category": "instructions",
  "suggestion": "Add a code example showing FieldValue.increment for ThunderCoin deduction with an explicit 'never use read-then-write' warning",
  "expected_impact": "Would eliminate the 40% failure rate on atomic coin deduction evals"
}
```

Categories: `instructions`, `examples`, `safety_rules`, `error_map`, `references`, `structure`

---

## Output Format

```json
[
  "Socket.IO guard check fails in 3/5 runs even with skill active — promote the guard rule higher in SKILL-bg.md",
  "IST timezone section is working well — all 5 pricing fix evals pass with skill vs 0% without",
  "Booking conversion evals show high variance (60% ± 30%) — the 60-second window explanation may be confusing",
  "Without-skill runs universally miss module.exports preservation — this is the highest-value rule in the skill",
  "Snack transaction evals: the skill correctly prevents removing the transaction, but agents sometimes add unnecessary extra reads"
]
```

---

## Guidelines

- **Report patterns, not individual failures** — the goal is to improve the skill, not re-grade individual runs
- **Be specific** — cite eval IDs, assertion names, and pass rates
- **Focus on what the skill can fix** — don't surface patterns that are inherently non-deterministic
- **Do NOT suggest improvements** in the benchmark analysis mode — save that for the blind comparison analysis mode
