#!/usr/bin/env bash
set -euo pipefail

SCREENSHOTS_DIR="tests/e2e/screenshots"

# ── Step 1: Check for screenshots ──────────────────────────────────────────────
echo "==> Checking for E2E screenshots in ${SCREENSHOTS_DIR}/"

shopt -s nullglob
png_files=("${SCREENSHOTS_DIR}"/*.png)
shopt -u nullglob

if [[ ${#png_files[@]} -eq 0 ]]; then
  echo "    No .png files found in ${SCREENSHOTS_DIR}/. Nothing to do."
  exit 0
fi

echo "    Found ${#png_files[@]} screenshot(s)."

# ── Step 2: Git operations — commit and push screenshots ───────────────────────
echo "==> Staging screenshots..."
git add -f "${SCREENSHOTS_DIR}"/*.png

if git diff --cached --quiet; then
  echo "    Screenshots are unchanged from last commit. Skipping commit."
else
  echo "    Committing screenshots..."
  git commit -m "chore: add E2E screenshots for PR review"
  echo "    Pushing to remote..."
  git push origin HEAD
fi

# ── Step 3: Detect current PR ─────────────────────────────────────────────────
echo "==> Detecting pull request..."

PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null || true)

if [[ -z "${PR_NUMBER}" ]]; then
  echo "    No open PR found for the current branch. Skipping gallery post."
  exit 0
fi

echo "    Found PR #${PR_NUMBER}."

# ── Step 4: Build image gallery markdown ───────────────────────────────────────
echo "==> Building screenshot gallery..."

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
BRANCH=$(git branch --show-current)

GALLERY=$'\n## E2E Screenshots\n\n| Screenshot | Preview |\n|------------|---------|'

for file in "${png_files[@]}"; do
  filename=$(basename "${file}")
  # Strip .png extension for the display name
  name="${filename%.png}"
  url="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${SCREENSHOTS_DIR}/${filename}"
  GALLERY+=$'\n'"| ${name} | ![${name}](${url}) |"
done

GALLERY+=$'\n'

echo "    Gallery built with ${#png_files[@]} image(s)."

# ── Step 5: Update PR description ─────────────────────────────────────────────
echo "==> Updating PR #${PR_NUMBER} description..."

EXISTING_BODY=$(gh pr view --json body -q '.body')

# Strip any existing E2E Screenshots section (and everything after it)
CLEAN_BODY="${EXISTING_BODY}"
if [[ "${CLEAN_BODY}" == *"## E2E Screenshots"* ]]; then
  CLEAN_BODY="${CLEAN_BODY%%## E2E Screenshots*}"
  # Remove trailing whitespace/newlines from the clean body
  CLEAN_BODY=$(printf '%s' "${CLEAN_BODY}" | sed -e 's/[[:space:]]*$//')
fi

NEW_BODY="${CLEAN_BODY}${GALLERY}"

gh pr edit "${PR_NUMBER}" --body "${NEW_BODY}"

echo "==> Done. PR #${PR_NUMBER} updated with screenshot gallery."
