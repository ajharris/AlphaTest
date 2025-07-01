// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Configure Jest timeout for all tests
jest.setTimeout(30000); // 30 seconds timeout for all tests

// Mock FileReader for file upload tests
Object.defineProperty(global, 'FileReader', {
  value: class MockFileReader {
    constructor() {
      this.result = null;
      this.onload = null;
    }
    
    readAsDataURL(file) {
      // Simulate file reading with immediate synchronous callback to avoid act warnings
      this.result = `data:${file.type};base64,mock-base64-data`;
      if (this.onload) {
        // Call onload synchronously to avoid React act warnings
        this.onload({ target: { result: this.result } });
      }
    }
  },
  writable: true
});
