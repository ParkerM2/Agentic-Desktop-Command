---
title: "Remove JSON Store Infrastructure"
status: backlog
priority: low
tags: [phase-2, wave-5, cleanup]
wave: 5
---

## Description
After all domains are migrated to SQLite, remove the JSON file read/write
utilities and any remaining file-based store code.

## Steps
1. Delete JSON store utility functions
2. Remove file-based data directories from user data
3. Update data-management cleanup service
4. Verify no JSON store references remain
