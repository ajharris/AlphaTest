#!/bin/bash
# Run all backend and frontend tests for AlphaTest with detailed error output
set -e

LOGFILE="test_run_$(date +%Y%m%d_%H%M%S).log"

# Backend tests (Python, Flask)
echo "Running backend tests..." | tee -a "$LOGFILE"
cd backend
export FLASK_ENV=testing
# Run backend tests with timeout (5 minutes)
if ! timeout 300 /workspaces/AlphaTest/.venv/bin/python run_tests_with_timeout.py 2>&1 | tee -a "../$LOGFILE"; then
  echo "Backend tests failed. See $LOGFILE for details." | tee -a "../$LOGFILE"
  exit 1
fi
cd ..

echo "Backend tests complete." | tee -a "$LOGFILE"

# Frontend tests (React, Jest)
echo "Running frontend tests..." | tee -a "$LOGFILE"
cd frontend
if ! npm install --no-audit --no-fund 2>&1 | tee -a "../$LOGFILE"; then
  echo "npm install failed. See $LOGFILE for details." | tee -a "../$LOGFILE"
  exit 1
fi
# Run frontend tests with timeout (10 minutes) and environment timeout
export JEST_TIMEOUT=30000
if ! timeout 600 npm test -- --watchAll=false 2>&1 | tee -a "../$LOGFILE"; then
  echo "Frontend tests failed. See $LOGFILE for details." | tee -a "../$LOGFILE"
  exit 1
fi
cd ..

echo "Frontend tests complete." | tee -a "$LOGFILE"

echo "All tests finished successfully." | tee -a "$LOGFILE"
