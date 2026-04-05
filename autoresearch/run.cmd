@echo off
REM ADC Autoresearch Launch Script (Windows)
REM Starts a headless Claude Code session running program.md
REM
REM Usage: autoresearch\run.cmd
REM
REM Estimated cost: ~$3-8 for 25 iterations on Opus 4.6
REM Estimated time: ~30-60 minutes

cd /d "%~dp0\.."

echo === ADC Autoresearch ===
echo Model: claude-opus-4-6
echo Iterations: 25
echo Metric: lint errors/warnings + typecheck + build
echo.
echo Starting in 5 seconds... (Ctrl+C to cancel)
timeout /t 5 /nobreak >nul

claude -p ^
  --model claude-opus-4-6 ^
  --allowedTools "Bash(*),Read(*),Write(*),Edit(*),Glob(*),Grep(*)" ^
  --output-format stream-json ^
  "Read autoresearch/program.md and execute the full 25-iteration optimization loop. Start with setup, then run all 25 iterations. Do not stop or ask questions."

echo.
echo === Autoresearch Complete ===
echo Results: autoresearch\results.tsv
echo Summary: autoresearch\summary.md
echo Findings: autoresearch\findings.md
pause
