# Verification

23 October 2026:

- npm install completed with no dependency vulnerabilities reported.
- npm test passed on Linux, Node 22 and PGlite: all 29 commands.
- The same npm test passed against a fresh local PostgreSQL 18.4 database: all 29 commands.
- npm run demo, npm run view and npm run docs passed with fictional data. Four branded HTML documents were produced after the demo route was planned.
- The weekly report was opened in headless Chromium and its screenshot inspected.
- The page gate passed with zero brand errors and three actual captured command outputs.
- GitHub workflow 39894853684 could not start any Windows, Linux or Postgres jobs because the account has a billing or spending-limit restriction. Windows execution remains unverified. The workflow retains Windows and Linux Node 20/22 plus Postgres coverage for a future run.

The smoke suite checks allocation gates, changed-plan rejection, eligibility, capacity, shift and return limits, planned breaks, recorded work thresholds, source preservation, repeat import, full import rollback, exports, drafts and HTML rendering. It creates an isolated temporary database and removes it after completion. TEST_DATABASE_URL must point to a fresh disposable Postgres database. It refuses a pre-existing delivery schema. No customer system was used.

The schema is ordinary Postgres SQL, with UUID defaults, foreign keys, checks, update triggers and views. PGlite exercises the same migration. The test suite uses Node paths and subprocess calls rather than shell-specific syntax.
