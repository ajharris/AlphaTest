#!/usr/bin/env python3
"""
Custom test runner with timeout configuration for backend tests.
"""
import unittest
import sys
import os
import signal
from unittest import TestResult

class TimeoutTestResult(TestResult):
    """Custom test result that handles timeouts gracefully"""
    
    def __init__(self, stream=None, verbosity=1, timeout=30):
        super().__init__(stream, verbosity)
        self.timeout = timeout
        
    def startTest(self, test):
        super().startTest(test)
        # Set timeout for individual test
        signal.alarm(self.timeout)
        
    def stopTest(self, test):
        # Cancel timeout
        signal.alarm(0)
        super().stopTest(test)

class TimeoutTestRunner(unittest.TextTestRunner):
    """Custom test runner with timeout support"""
    
    def __init__(self, timeout=30, **kwargs):
        self.timeout = timeout
        super().__init__(**kwargs)
        
    def _makeResult(self):
        return TimeoutTestResult(self.stream, self.verbosity, self.timeout)

def timeout_handler(signum, frame):
    """Handle timeout signal"""
    raise TimeoutError("Test exceeded timeout limit")

if __name__ == '__main__':
    # Set up timeout handler
    signal.signal(signal.SIGALRM, timeout_handler)
    
    # Configure test discovery and running
    loader = unittest.TestLoader()
    suite = loader.discover('.', pattern='test_*.py')
    
    # Run tests with timeout
    runner = TimeoutTestRunner(
        timeout=30,  # 30 seconds per test
        verbosity=2,
        buffer=True
    )
    
    result = runner.run(suite)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
