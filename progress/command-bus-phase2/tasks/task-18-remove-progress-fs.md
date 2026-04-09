---
title: "Remove Progress Filesystem Dependency"
status: backlog
priority: low
tags: [phase-2, wave-5, cleanup]
wave: 5
---

## Description
After progress tasks are fully in SQLite, remove the filesystem-based
progress directory scanning and YAML frontmatter parsing.

## Steps
1. Update progress-service to be SQLite-only
2. Remove directory scanning / frontmatter parsing code
3. Keep markdown content files for research/plans (read-only)
4. Update CLAUDE.md progress pipeline docs
