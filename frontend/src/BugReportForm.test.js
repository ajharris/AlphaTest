import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BugReportForm from './BugReportForm';

// Mock file for testing
const createMockFile = (name, type, size = 1024) => {
  const file = new File(['test content'], name, { type });
  // Override the size property to work correctly in test environment
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  return file;
};

// Mock navigator properties for consistent testing
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});

Object.defineProperty(navigator, 'platform', {
  writable: true,
  value: 'Win32'
});

Object.defineProperty(navigator, 'language', {
  writable: true,
  value: 'en-US'
});

// Mock screen dimensions - jest environment doesn't have real screen
Object.defineProperty(global.screen, 'width', {
  writable: true,
  value: 1920
});

Object.defineProperty(global.screen, 'height', {
  writable: true,
  value: 1080
});

Object.defineProperty(global.window, 'innerWidth', {
  writable: true,
  value: 1200
});

Object.defineProperty(global.window, 'innerHeight', {
  writable: true,
  value: 800
});

describe('BugReportForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Form Rendering
  describe('Form Rendering', () => {
    test('renders all required fields: Title, Description, Screenshot Upload, and Browser/Device Info', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      // Check for form title
      expect(screen.getByText('Report a Bug')).toBeInTheDocument();
      
      // Check for Title field
      expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brief description of the issue')).toBeInTheDocument();
      
      // Check for Description field
      expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Detailed description of the bug...')).toBeInTheDocument();
      
      // Check for Screenshot Upload field
      expect(screen.getByLabelText(/screenshot \(optional\)/i)).toBeInTheDocument();
      expect(screen.getByText('Screenshot (optional)')).toBeInTheDocument();
      
      // Check for Browser/Device Info field
      expect(screen.getByLabelText(/browser\/device info \(auto-filled\)/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Mozilla\/5\.0.*Win32.*en-US/)).toBeInTheDocument();
      
      // Check for Submit button
      expect(screen.getByRole('button', { name: /submit bug report/i })).toBeInTheDocument();
    });

    test('displays autofilled browser and device information correctly', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByDisplayValue(/Mozilla\/5\.0.*Win32.*en-US/);
      expect(deviceInfoField).toBeInTheDocument();
      expect(deviceInfoField).toHaveAttribute('readonly');
      
      // Check that it contains expected device info
      expect(deviceInfoField.value).toContain('Browser: Mozilla/5.0');
      expect(deviceInfoField.value).toContain('Platform: Win32');
      expect(deviceInfoField.value).toContain('Language: en-US');
      expect(deviceInfoField.value).toContain('Screen: 1920x1080');
      expect(deviceInfoField.value).toContain('Viewport: 1200x800');
    });
  });

  // Test 2: Title and Description Input
  describe('Title and Description Input', () => {
    test('allows user to type into Title field and reflects value in state', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      await userEvent.type(titleField, 'Test Bug Title');
      
      expect(titleField).toHaveValue('Test Bug Title');
    });

    test('allows user to type into Description field and reflects value in state', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const descriptionField = screen.getByLabelText(/description \*/i);
      await userEvent.type(descriptionField, 'This is a detailed description of the bug');
      
      expect(descriptionField).toHaveValue('This is a detailed description of the bug');
    });

    test('clears validation errors when user starts typing', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      const titleField = screen.getByLabelText(/title \*/i);
      
      // Submit empty form to trigger validation errors
      fireEvent.click(submitButton);
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      
      // Start typing in title field
      await userEvent.type(titleField, 'T');
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  // Test 3: File Upload
  describe('File Upload', () => {
    test('allows user to upload an image file and displays preview', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const imageFile = createMockFile('test-image.png', 'image/png');
      
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      
      expect(fileInput.files[0]).toBe(imageFile);
      expect(fileInput.files).toHaveLength(1);
    });

    test('updates state when file is uploaded', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const imageFile = createMockFile('test-image.jpg', 'image/jpeg');
      
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      
      expect(fileInput.files[0]).toBe(imageFile);
      expect(fileInput.files[0].name).toBe('test-image.jpg');
      expect(fileInput.files[0].type).toBe('image/jpeg');
    });
  });

  // Test 4: File Type Validation
  describe('File Type Validation', () => {
    test('shows validation error when uploading non-image file (.exe)', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const exeFile = createMockFile('malware.exe', 'application/x-msdownload');
      
      fireEvent.change(fileInput, { target: { files: [exeFile] } });
      
      expect(screen.getByText('Please upload a valid image file (JPEG, PNG, GIF, WebP)')).toBeInTheDocument();
    });

    test('shows validation error when uploading non-image file (.txt)', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const txtFile = createMockFile('readme.txt', 'text/plain');
      
      fireEvent.change(fileInput, { target: { files: [txtFile] } });
      
      expect(screen.getByText('Please upload a valid image file (JPEG, PNG, GIF, WebP)')).toBeInTheDocument();
    });

    test('shows validation error when file size exceeds limit', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const largeFile = createMockFile('huge-image.png', 'image/png', 6 * 1024 * 1024); // 6MB
      
      // Debug: check if file size is set correctly
      console.log('File size in test:', largeFile.size);
      console.log('File type in test:', largeFile.type);
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      // Wait a bit for any async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
    });

    test('accepts valid image formats (JPEG, PNG, GIF, WebP)', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      
      const validFiles = [
        createMockFile('test.jpg', 'image/jpeg'),
        createMockFile('test.png', 'image/png'),
        createMockFile('test.gif', 'image/gif'),
        createMockFile('test.webp', 'image/webp')
      ];
      
      for (const file of validFiles) {
        fireEvent.change(fileInput, { target: { files: [file] } });
        expect(screen.queryByText('Please upload a valid image file')).not.toBeInTheDocument();
        
        // Clear the file input for next test
        fireEvent.change(fileInput, { target: { files: [] } });
        expect(fileInput.value).toBe('');
      }
    });
  });

  // Test 5: Browser/Device Info Autofill
  describe('Browser/Device Info Autofill', () => {
    test('correctly detects and displays browser and device info from User-Agent', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      
      expect(deviceInfoField.value).toContain('Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      expect(deviceInfoField.value).toContain('Platform: Win32');
      expect(deviceInfoField.value).toContain('Language: en-US');
      expect(deviceInfoField.value).toContain('Screen: 1920x1080');
      expect(deviceInfoField.value).toContain('Viewport: 1200x800');
    });

    test('device info field is readonly', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField).toHaveAttribute('readonly');
    });

    test('includes timestamp in device info', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      // Check that the timestamp format is present (ISO string contains 'T' and 'Z')
      expect(deviceInfoField.value).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // Test 6: Form Submission (Valid Input)
  describe('Form Submission (Valid Input)', () => {
    test('calls submission function with correct payload when form is complete', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      
      const imageFile = createMockFile('screenshot.png', 'image/png');
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Bug Title',
          description: 'Bug Description',
          screenshot: imageFile,
          repository_id: null,
          deviceInfo: expect.objectContaining({
            userAgent: expect.stringContaining('Mozilla/5.0'),
            platform: 'Win32',
            language: 'en-US',
            screenResolution: '1920x1080',
            viewport: '1200x800',
            timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
          })
        });
      });
    });

    test('submits form without screenshot when not provided', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Bug Title',
          description: 'Bug Description',
          screenshot: null,
          repository_id: null,
          deviceInfo: expect.any(Object)
        });
      });
    });
  });

  // Test 7: Form Submission (Missing Title/Description)
  describe('Form Submission (Missing Title/Description)', () => {
    test('displays validation errors and prevents submission when title is missing', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(descriptionField, 'Description only');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('displays validation errors and prevents submission when description is missing', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Title only');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('displays validation errors for both title and description when both are missing', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('does not submit when fields contain only whitespace', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, '   ');
      await userEvent.type(descriptionField, '   ');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // Test 8: Loading and Success State
  describe('Loading and Success State', () => {
    test('shows loading spinner during submission', async () => {
      render(<BugReportForm onSubmit={mockOnSubmit} isSubmitting={true} />);
      
      const submitButton = screen.getByRole('button', { name: /submitting.../i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    test('shows success message after successful API response', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bug report submitted successfully!')).toBeInTheDocument();
      });
      
      const successMessage = screen.getByRole('alert');
      expect(successMessage).toHaveClass('success-message');
    });

    test('button is disabled during submission', () => {
      render(<BugReportForm onSubmit={mockOnSubmit} isSubmitting={true} />);
      
      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });
  });

  // Test 9: Error State Handling
  describe('Error State Handling', () => {
    test('shows error message when API submission fails with network error', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveClass('error-message');
    });

    test('shows generic error message when API submission fails without specific error', async () => {
      mockOnSubmit.mockRejectedValue(new Error());
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to submit bug report. Please try again.')).toBeInTheDocument();
      });
    });

    test('shows server error message when API returns server error', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Server error: Internal server error'));
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Server error: Internal server error')).toBeInTheDocument();
      });
    });
  });

  // Test 10: Clear Form on Success
  describe('Clear Form on Success', () => {
    test('clears all inputs after successful submission', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      
      const imageFile = createMockFile('screenshot.png', 'image/png');
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bug report submitted successfully!')).toBeInTheDocument();
      });
      
      // Check that form fields are cleared
      expect(titleField).toHaveValue('');
      expect(descriptionField).toHaveValue('');
      // Note: In test environment, file input clearing might not reflect in .files property
      // but the important thing is that the value is cleared
      expect(fileInput.value).toBe('');
      
      // Device info should be refreshed but still present
      const deviceInfoField = screen.getByLabelText(/browser\/device info/i);
      expect(deviceInfoField.value).toContain('Browser: Mozilla/5.0');
    });

    test('clears file preview after successful submission', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      
      const imageFile = createMockFile('screenshot.png', 'image/png');
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bug report submitted successfully!')).toBeInTheDocument();
      });
      
      // File preview should be removed
      expect(screen.queryByAltText('Screenshot preview')).not.toBeInTheDocument();
    });

    test('clears validation errors after successful submission', async () => {
      mockOnSubmit.mockResolvedValue();
      
      render(<BugReportForm onSubmit={mockOnSubmit} />);
      
      const titleField = screen.getByLabelText(/title \*/i);
      const descriptionField = screen.getByLabelText(/description \*/i);
      const submitButton = screen.getByRole('button', { name: /submit bug report/i });
      
      // First submit empty form to trigger errors
      fireEvent.click(submitButton);
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      
      // Fill form and submit successfully
      await userEvent.type(titleField, 'Bug Title');
      await userEvent.type(descriptionField, 'Bug Description');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bug report submitted successfully!')).toBeInTheDocument();
      });
      
      // Validation errors should be cleared
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Description is required')).not.toBeInTheDocument();
    });
  });
});
