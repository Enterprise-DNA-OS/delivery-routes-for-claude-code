# Verification

23 October 2026: npm install completed with no dependency vulnerabilities reported. npm test passed locally on Linux, Node 22 and PGlite, exercising all 29 commands. npm run demo, npm run view and npm run docs are checked separately with fictional data. Windows and Postgres results are recorded after the private repository workflow completes.

The smoke suite creates an isolated temporary database and removes it after completion. TEST_DATABASE_URL must point to a fresh disposable Postgres database. It refuses a pre-existing delivery schema. No customer system is used.
