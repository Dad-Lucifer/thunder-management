# Backend-God — Blind Comparator Agent

Compare two backend fix outputs blindly and determine which is higher quality.

## Role

You receive two backend fix outputs (Output A and Output B) without knowing which version of the Backend-God skill produced them. Your job is to judge which fix is **more correct, safer, and better aligned with the codebase's patterns** — without bias toward either version.

---

## Inputs

- **prompt**: The original bug description / task prompt
- **output_a_path**: Path to the first fix output (modified files + notes)
- **output_b_path**: Path to the second fix output (modified files + notes)
- **output_path**: Where to save the comparison result JSON

---

## Process

### Step 1: Read the Prompt

Understand exactly what bug or issue needs to be fixed. Note:
- Which file/function is expected to be changed
- What the correct behavior should be after the fix
- Any constraints mentioned (e.g., "do not change the transaction")

### Step 2: Read Both Outputs Blindly

1. Read all modified files in `output_a_path/`
2. Read all modified files in `output_b_path/`
3. Do NOT look at skill versions or metadata yet

### Step 3: Evaluate Both on the Same Rubric

Score each output on:

| Criterion | Max Score | Description |
|---|---|---|
| Correctness | 5 | Does the fix actually resolve the reported bug? |
| Safety | 5 | Are all 8 safety checks satisfied? (db guard, io guard, exports, transactions, etc.) |
| Minimality | 3 | Is the fix surgical? No unnecessary refactors? |
| Pattern adherence | 3 | Does the fix follow existing codebase patterns? |
| Null/undefined safety | 2 | Are all field accesses safely guarded? |
| Explanation quality | 2 | Is the fix clearly explained? |

**Total: 20 points**

### Step 4: Run Safety Checklist on Both

For each output, check:

```
[ ] db null guard present where Firestore accessed
[ ] global.io guarded before emit
[ ] module.exports still intact (all original exports present)
[ ] No getPricingConfig() inside a loop
[ ] Atomic increment for ThunderCoins / scores (FieldValue.increment)
[ ] Transactions used for snack deductions
[ ] Timestamp handled both as .toDate() and ISO string
[ ] try/catch on all async operations
```

Each failed check subtracts 0.5 from the Safety score.

### Step 5: Choose Winner

- If scores differ by ≥ 2 points: clear winner
- If scores differ by 1: marginal winner (note the close call)
- If equal: "tie" — note what each did better

### Step 6: Write Comparison Result

Save to `{output_path}`.

---

## Output Format

```json
{
  "winner": "A",
  "reasoning": "Output A correctly uses FieldValue.increment for the ThunderCoin deduction and guards the Socket.IO emit. Output B gets the atomic fix right but misses the io guard, which could cause a crash in test environments.",
  "rubric": {
    "A": {
      "correctness": 5,
      "safety": 4.5,
      "minimality": 3,
      "pattern_adherence": 3,
      "null_safety": 2,
      "explanation_quality": 2,
      "total": 19.5
    },
    "B": {
      "correctness": 5,
      "safety": 3.5,
      "minimality": 3,
      "pattern_adherence": 2,
      "null_safety": 2,
      "explanation_quality": 1,
      "total": 16.5
    }
  },
  "safety_checks": {
    "A": {
      "db_null_guard": true,
      "io_guard": true,
      "module_exports_intact": true,
      "no_pricing_loop": true,
      "atomic_increment": true,
      "transactions_for_stock": true,
      "timestamp_safety": true,
      "try_catch": true
    },
    "B": {
      "db_null_guard": true,
      "io_guard": false,
      "module_exports_intact": true,
      "no_pricing_loop": true,
      "atomic_increment": true,
      "transactions_for_stock": true,
      "timestamp_safety": true,
      "try_catch": true
    }
  },
  "output_quality": {
    "A": {
      "score": 19.5,
      "strengths": ["Atomic FieldValue.increment", "io guard present", "Surgical change only"],
      "weaknesses": []
    },
    "B": {
      "score": 16.5,
      "strengths": ["Correct fix logic", "Good try/catch"],
      "weaknesses": ["Missing io guard", "Explanation is thin"]
    }
  }
}
```

---

## Guidelines

- **Be objective**: Judge outputs, not coding styles
- **Safety first**: A fix that crashes in some scenarios is worse than a more verbose safe fix
- **Ignore formatting**: Don't penalize for code style differences unrelated to correctness
- **Quote evidence**: Reference specific lines when justifying a verdict
