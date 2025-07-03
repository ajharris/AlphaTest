import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import BugReportForm from './BugReportForm';

// Mock different browser environments for testing
const mockNavigatorProperties = (userAgent, platform, language) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: userAgent
  });
  Object.defineProperty(navigator, 'platform', {
    writable: true,
    value: platform
  });
  Object.defineProperty(navigator, 'language', {
    writable: true,
    value: language
  });
};

const mockScreenProperties = (width, height) => {
  Object.defineProperty(window.screen, 'width', {
    writable: true,
    value: width
  });
  Object.defineProperty(window.screen, 'height', {
    writable: true,
    value: height
  });
};

const mockWindowProperties = (innerWidth, innerHeight) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: innerWidth
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    value: innerHeight
  });
};

describe('BugReportForm - getBrowserDeviceInfo Unit Tests', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default values
    mockNavigatorProperties(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Win32',
      'en-US'
    );
    mockScreenProperties(1920, 1080);
    mockWindowProperties(1200, 800);
  });

  describe('Browser Detection', () => {
    test('detects Chrome browser correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Win32',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Chrome/91.0.4472.124');
    });

    test('detects Firefox browser correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Win32',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Firefox/89.0');
    });

    test('detects Safari browser correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'MacIntel',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Safari/605.1.15');
    });

    test('detects Edge browser correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        'Win32',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Edg/91.0.864.59');
    });
  });

  describe('Platform Detection', () => {
    test('detects Windows platform correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Win32',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Platform: Win32');
    });

    test('detects macOS platform correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'MacIntel',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Platform: MacIntel');
    });

    test('detects Linux platform correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Linux x86_64',
        'en-US'
      );

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Platform: Linux x86_64');
    });
  });

  describe('Language Detection', () => {
    test('detects different languages correctly', () => {
      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'];

      languages.forEach(lang => {
        // Save original language
        const originalLanguage = navigator.language;
        
        // Create a mock navigator object
        const mockNavigator = {
          ...navigator,
          language: lang,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: 'Win32'
        };
        
        // Replace navigator temporarily
        Object.defineProperty(window, 'navigator', {
          writable: true,
          value: mockNavigator
        });

        render(<BugReportForm onSubmit={mockOnSubmit} />);
        
        const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
        expect(deviceInfoField.value).toContain(`Language: ${lang}`);
        
        // Clean up for next iteration
        cleanup();
        
        // Restore original navigator
        Object.defineProperty(window, 'navigator', {
          writable: true,
          value: { ...navigator, language: originalLanguage }
        });
      });
    });
  });

  describe('Screen Resolution Detection', () => {
    test('detects various screen resolutions correctly', () => {
      const resolutions = [
        [1920, 1080],
        [2560, 1440],
        [3840, 2160],
        [1366, 768],
        [1024, 768]
      ];

      resolutions.forEach(([width, height]) => {
        // Mock screen properties
        Object.defineProperty(screen, 'width', {
          writable: true,
          configurable: true,
          value: width
        });
        Object.defineProperty(screen, 'height', {
          writable: true,
          configurable: true,
          value: height
        });

        mockScreenProperties(width, height);
        mockWindowProperties(1200, 800); // Keep viewport constant

        render(<BugReportForm onSubmit={mockOnSubmit} />);
        
        const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
        expect(deviceInfoField.value).toContain(`Screen: ${width}x${height}`);
        
        // Clean up for next iteration
        cleanup();
      });
    });
  });

  describe('Viewport Detection', () => {
    test('detects various viewport sizes correctly', () => {
      const viewports = [
        [1200, 800],
        [1024, 768],
        [800, 600],
        [1440, 900],
        [375, 667] // Mobile viewport
      ];

      viewports.forEach(([width, height]) => {
        // Mock window properties
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height
        });

        mockScreenProperties(1920, 1080); // Keep screen constant
        mockWindowProperties(width, height);

        render(<BugReportForm onSubmit={mockOnSubmit} />);
        
        const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
        expect(deviceInfoField.value).toContain(`Viewport: ${width}x${height}`);
        
        // Clean up for next iteration
        cleanup();
      });
    });
  });

  describe('Timestamp Generation', () => {
    test('includes valid ISO timestamp', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      const timestampMatch = deviceInfoField.value.match(/Timestamp: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      expect(timestampMatch).toBeTruthy();
      
      const timestamp = new Date(timestampMatch[1]);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('timestamp is recent (within last minute)', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      const timestampMatch = deviceInfoField.value.match(/Timestamp: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      const timestamp = new Date(timestampMatch[1]);
      const now = new Date();
      const diffInSeconds = (now - timestamp) / 1000;
      
      expect(diffInSeconds).toBeLessThan(60); // Should be within last minute
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles undefined navigator properties gracefully', () => {
      // Mock undefined properties
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: undefined
      });
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: undefined
      });
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: undefined
      });

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      // Should not crash and should contain some fallback values
      expect(deviceInfoField.value).toContain('Browser:');
      expect(deviceInfoField.value).toContain('Platform:');
      expect(deviceInfoField.value).toContain('Language:');
    });

    test('handles zero screen dimensions', () => {
      mockScreenProperties(0, 0);
      mockWindowProperties(0, 0);

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Screen: 0x0');
      expect(deviceInfoField.value).toContain('Viewport: 0x0');
    });

    test('handles very large screen dimensions', () => {
      mockScreenProperties(999999, 999999);
      mockWindowProperties(999999, 999999);

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Screen: 999999x999999');
      expect(deviceInfoField.value).toContain('Viewport: 999999x999999');
    });
  });

  describe('Mobile Device Detection', () => {
    test('detects mobile Safari correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        'iPhone',
        'en-US'
      );
      mockScreenProperties(375, 812);
      mockWindowProperties(375, 635);

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('iPhone');
      expect(deviceInfoField.value).toContain('Mobile/15E148');
      expect(deviceInfoField.value).toContain('Screen: 375x812');
      expect(deviceInfoField.value).toContain('Viewport: 375x635');
    });

    test('detects Android Chrome correctly', () => {
      mockNavigatorProperties(
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        'Linux armv8l',
        'en-US'
      );
      mockScreenProperties(360, 740);
      mockWindowProperties(360, 640);

      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Android 10');
      expect(deviceInfoField.value).toContain('Mobile Safari');
      expect(deviceInfoField.value).toContain('Screen: 360x740');
    });
  });
});
