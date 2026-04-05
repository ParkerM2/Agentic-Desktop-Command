#!/bin/bash
# ADC Autoresearch Metric — Composite Quality Score
# Lower is better. Measures: lint, types, build, code size, file sprawl, duplication.
#
# Usage: bash autoresearch/measure.sh
# Output: single integer score + breakdown

cd "$(dirname "$0")/.."

# ── Lint ──────────────────────────────────────────────────
lint_output=$(npx eslint src/ --max-warnings=999999 --format json 2>/dev/null || echo "[]")
lint_errors=$(echo "$lint_output" | node -e "
  const d=require('fs').readFileSync(0,'utf8');
  try{const r=JSON.parse(d);console.log(r.reduce((a,f)=>a+f.errorCount,0))}
  catch{console.log(0)}
" 2>/dev/null || echo 0)
lint_warnings=$(echo "$lint_output" | node -e "
  const d=require('fs').readFileSync(0,'utf8');
  try{const r=JSON.parse(d);console.log(r.reduce((a,f)=>a+f.warningCount,0))}
  catch{console.log(0)}
" 2>/dev/null || echo 0)

# ── TypeScript ────────────────────────────────────────────
tc_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo 0)
# Ensure single number
tc_errors=$(echo "$tc_errors" | tr -d '[:space:]' | head -c 10)
tc_errors=${tc_errors:-0}

# ── Build ─────────────────────────────────────────────────
if npm run build > /dev/null 2>&1; then
  build_fail=0
else
  build_fail=1
fi

# ── Source lines ──────────────────────────────────────────
total_lines=0
while IFS= read -r f; do
  n=$(wc -l < "$f" 2>/dev/null || echo 0)
  total_lines=$((total_lines + n))
done < <(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" 2>/dev/null)

# ── Large files (>300 lines) ──────────────────────────────
large_files=0
while IFS= read -r f; do
  n=$(wc -l < "$f" 2>/dev/null || echo 0)
  if [ "$n" -gt 300 ]; then
    large_files=$((large_files + 1))
  fi
done < <(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" 2>/dev/null)

# ── Duplicate exports ────────────────────────────────────
duplicate_exports=$(grep -rh "^export function \|^export const \|^export class " src/ 2>/dev/null \
  | sed 's/export function //; s/export const //; s/export class //' \
  | sed 's/[(<:].*//' | sort | uniq -d | wc -l 2>/dev/null || echo 0)
duplicate_exports=$(echo "$duplicate_exports" | tr -d '[:space:]')
duplicate_exports=${duplicate_exports:-0}

# ── Calculate score ───────────────────────────────────────
lint_score=$((lint_errors * 10 + lint_warnings * 2))
tc_score=$((tc_errors * 50))
build_score=$((build_fail * 1000))
lines_score=$((total_lines / 100))
large_score=$((large_files * 5))
dup_score=$((duplicate_exports * 3))

total=$((lint_score + tc_score + build_score + lines_score + large_score + dup_score))

# ── Output ────────────────────────────────────────────────
echo "=== ADC Quality Score: $total ==="
echo "  lint_errors:   $lint_errors (x10 = $((lint_errors * 10)))"
echo "  lint_warnings: $lint_warnings (x2 = $((lint_warnings * 2)))"
echo "  tc_errors:     $tc_errors (x50 = $tc_score)"
echo "  build_fail:    $build_fail (x1000 = $build_score)"
echo "  total_lines:   $total_lines (/100 = $lines_score)"
echo "  large_files:   $large_files (x5 = $large_score)"
echo "  dup_exports:   $duplicate_exports (x3 = $dup_score)"
echo "SCORE=$total"
