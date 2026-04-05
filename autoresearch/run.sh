#!/bin/bash
# ADC Autoresearch Launch Script
# Starts a headless Claude Code session running program.md
#
# Usage: bash autoresearch/run.sh
#
# Estimated cost: ~$3-8 for 25 iterations on Opus 4.6
# Estimated time: ~30-60 minutes (depends on build speed)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== ADC Autoresearch ==="
echo "Model: claude-opus-4-6"
echo "Iterations: 25"
echo "Metric: lint errors/warnings + typecheck + build"
echo ""
echo "Starting in 5 seconds... (Ctrl+C to cancel)"
sleep 5

# Launch Claude Code headless with the program.md prompt
claude -p \
  --model claude-opus-4-6 \
  --allowedTools "Bash(*),Read(*),Write(*),Edit(*),Glob(*),Grep(*)" \
  --output-format stream-json \
  "Read autoresearch/program.md and execute the full 25-iteration optimization loop. Start with setup, then run all 25 iterations. Do not stop or ask questions." \
  2>&1 | tee "autoresearch/session-$(date +%Y%m%d-%H%M%S).log"

echo ""
echo "=== Autoresearch Complete ==="
echo "Results: autoresearch/results.tsv"
echo "Summary: autoresearch/summary.md"
echo "Findings: autoresearch/findings.md"
