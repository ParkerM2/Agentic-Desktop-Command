-- Migration: Add description column to test_suite_scripts

ALTER TABLE test_suite_scripts ADD COLUMN description TEXT;
