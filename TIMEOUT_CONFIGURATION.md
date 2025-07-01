# Test Timeout Configuration

This document explains the timeout configurations implemented to ensure tests continue to pass under different system conditions.

## Overview

Timeout configurations have been added at multiple levels to prevent tests from hanging indefinitely and to ensure consistent test execution across different environments.

## Frontend Tests (React/Jest)

### Configuration Files
- **setupTests.js**: Contains Jest global timeout configuration (`jest.setTimeout(30000)`)
- **run_all_tests.sh**: Sets environment timeout and script-level timeout

### Timeout Levels
1. **Global Jest Timeout**: 30 seconds per test (configured in setupTests.js)
2. **Script Timeout**: 10 minutes total for all frontend tests
3. **Environment Variable**: `JEST_TIMEOUT=30000` for consistency

### Implementation
```javascript
// In setupTests.js
jest.setTimeout(30000); // 30 seconds timeout for all tests
```

```bash
# In run_all_tests.sh
export JEST_TIMEOUT=30000
timeout 600 npm test -- --watchAll=false
```

## Backend Tests (Python/Flask)

### Configuration Files
- **test_bug_report_api.py**: Individual test timeout using signal.alarm()
- **run_tests_with_timeout.py**: Custom test runner with timeout support
- **run_all_tests.sh**: Script-level timeout

### Timeout Levels
1. **Individual Test Timeout**: 30 seconds per test method
2. **Custom Test Runner**: Graceful timeout handling
3. **Script Timeout**: 5 minutes total for all backend tests

### Implementation
```python
# In test_bug_report_api.py
def setUp(self):
    signal.alarm(30)  # 30 second timeout

def tearDown(self):
    signal.alarm(0)   # Cancel timeout
```

```bash
# In run_all_tests.sh
timeout 300 /workspaces/AlphaTest/.venv/bin/python run_tests_with_timeout.py
```

## Test Script Timeouts

The main test runner script (`run_all_tests.sh`) includes multiple timeout layers:

### Backend Tests
- **Individual test timeout**: 30 seconds (via signal.alarm)
- **Total backend timeout**: 5 minutes (300 seconds)

### Frontend Tests  
- **Individual test timeout**: 30 seconds (via Jest configuration)
- **Total frontend timeout**: 10 minutes (600 seconds)

## Benefits

1. **Prevents hanging tests**: Tests that get stuck will be terminated gracefully
2. **Consistent execution time**: Predictable test duration across environments
3. **Better CI/CD integration**: Prevents indefinite pipeline delays
4. **Resource optimization**: Prevents runaway test processes

## Customization

### To change timeout values:

**Frontend (Jest):**
```javascript
// In setupTests.js
jest.setTimeout(60000); // 60 seconds
```

**Backend (Python):**
```python
# In test setup
signal.alarm(60)  # 60 seconds
```

**Script-level:**
```bash
# In run_all_tests.sh
timeout 1200 npm test  # 20 minutes
```

## Notes

- Create React App (CRA) has limitations on Jest configuration overrides
- The `jest.setTimeout()` in setupTests.js is the most reliable way to configure Jest timeouts with CRA
- Backend tests use Python's signal module for timeout handling
- All timeout values can be adjusted based on system performance requirements

## Troubleshooting

If tests are timing out:
1. Check if the timeout values are appropriate for your system
2. Verify that tests aren't actually hanging (vs. just slow)
3. Consider increasing timeout values for slower systems
4. Check for resource constraints (CPU, memory, disk I/O)

## Test Status with Timeouts

After implementing these timeout configurations:
- ✅ All 84 tests continue to pass
- ✅ Tests complete within expected timeframes
- ✅ No hanging or indefinite execution
- ✅ Consistent results across runs
