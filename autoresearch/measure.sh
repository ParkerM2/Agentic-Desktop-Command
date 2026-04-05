#!/bin/bash
# ADC Autoresearch Metric — Agent Navigation Efficiency Score
# Lower is better.
#
# The goal: make every file findable in 1 search, readable in 1 read,
# and changeable without touching unrelated code. This directly reduces
# agent context consumption and eliminates wrong-location changes.
#
# Usage: bash autoresearch/measure.sh

cd "$(dirname "$0")/.."

# ── Lint (gate check — must stay at zero) ─────────────────
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

# ── TypeScript + Build (gate — must pass) ─────────────────
tc_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo 0)
tc_errors=$(echo "$tc_errors" | tr -d '[:space:]')
tc_errors=${tc_errors:-0}

if npm run build > /dev/null 2>&1; then build_fail=0; else build_fail=1; fi

# ── AGENT EFFICIENCY METRICS ─────────────────────────────

# 1. Files over 200 lines — an agent must read the whole file to find
#    one function. Each is a context tax on every future change.
files_over_200=0
files_over_400=0
while IFS= read -r f; do
  n=$(wc -l < "$f" 2>/dev/null || echo 0)
  n=$(echo "$n" | tr -d '[:space:]')
  if [ "$n" -gt 400 ]; then
    files_over_400=$((files_over_400 + 1))
  elif [ "$n" -gt 200 ]; then
    files_over_200=$((files_over_200 + 1))
  fi
done < <(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" ! -path "*/node_modules/*" 2>/dev/null)

# 2. Functions per file — more than 8 means the file does too many things.
#    An agent searching for one function reads N-1 irrelevant ones.
dense_files=0
while IFS= read -r f; do
  funcs=$(grep -cE "^(export )?(async )?(function |const \w+ = |class )" "$f" 2>/dev/null || echo 0)
  funcs=$(echo "$funcs" | tr -d '[:space:]')
  if [ "${funcs:-0}" -gt 8 ]; then
    dense_files=$((dense_files + 1))
  fi
done < <(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" ! -name "index.ts" ! -path "*/node_modules/*" 2>/dev/null)

# 3. Duplicate export names — agent finds 2+ files exporting the same
#    name, reads both, picks wrong one. Each duplicate = a wrong-turn risk.
dup_exports=$(grep -rh "^export function \|^export const \|^export class " src/ 2>/dev/null \
  | sed 's/export function //; s/export const //; s/export class //' \
  | sed 's/[(<:].*//' | sort | uniq -d | wc -l 2>/dev/null || echo 0)
dup_exports=$(echo "$dup_exports" | tr -d '[:space:]')
dup_exports=${dup_exports:-0}

# 4. Total source lines — raw proxy for how much an agent might need
#    to read across a full feature change
total_lines=0
while IFS= read -r f; do
  n=$(wc -l < "$f" 2>/dev/null || echo 0)
  n=$(echo "$n" | tr -d '[:space:]')
  total_lines=$((total_lines + n))
done < <(find src/ \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" ! -path "*/node_modules/*" 2>/dev/null)

# ── SCORE ─────────────────────────────────────────────────
# Weights reflect agent impact:
#   - 400+ line file: agent MUST read it all, huge context cost (x15)
#   - 200-400 line file: significant but manageable (x5)
#   - Dense file (8+ funcs): search confusion, wrong function edits (x8)
#   - Duplicate export: wrong-file risk (x4)
#   - Total lines: baseline bloat (/100)
#   - Lint/type/build: gates that break everything (high multipliers)

gate_score=$((lint_errors * 10 + lint_warnings * 2 + tc_errors * 50 + build_fail * 1000))
fat_file_score=$((files_over_400 * 15 + files_over_200 * 5))
dense_score=$((dense_files * 8))
dup_score=$((dup_exports * 4))
bloat_score=$((total_lines / 100))

total=$((gate_score + fat_file_score + dense_score + dup_score + bloat_score))

# ── Output ────────────────────────────────────────────────
echo "=== Agent Navigation Score: $total ==="
echo ""
echo "  GATE (must stay zero):"
echo "    lint_errors:    $lint_errors (x10 = $((lint_errors * 10)))"
echo "    lint_warnings:  $lint_warnings (x2 = $((lint_warnings * 2)))"
echo "    tc_errors:      $tc_errors (x50 = $((tc_errors * 50)))"
echo "    build_fail:     $build_fail (x1000 = $((build_fail * 1000)))"
echo ""
echo "  AGENT EFFICIENCY:"
echo "    files_400+:     $files_over_400 (x15 = $((files_over_400 * 15)))"
echo "    files_200-400:  $files_over_200 (x5 = $((files_over_200 * 5)))"
echo "    dense_files:    $dense_files (x8 = $((dense_files * 8)))"
echo "    dup_exports:    $dup_exports (x4 = $((dup_exports * 4)))"
echo "    total_lines:    $total_lines (/100 = $bloat_score)"
echo ""
echo "SCORE=$total"
