import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock file for testing
const createMockFile = (name, type, size = 1024) => {
  const file = new File(['test content'], name, { type, size });
  return file;
};

describe('Bug Report Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('complete bug report submission flow with all fields', async () => {
    const user = userEvent;
    
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bug_report_id: 'bug_12345',
        message: 'Bug report submitted successfully'
      })
    });

    render(<App />);
    
    // Show the bug report form
    const showFormButton = screen.getByText('Show Bug Report Form');
    await user.click(showFormButton);
    
    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText('Report a Bug')).toBeInTheDocument();
    });
    
    // Fill out the form
    const titleField = screen.getByLabelText(/title \*/i);
    const descriptionField = screen.getByLabelText(/description \*/i);
    const fileInput = screen.getByLabelText(/screenshot \(optional\)/i);
    
    await user.type(titleField, 'Integration Test Bug');
    await user.type(descriptionField, 'This is a comprehensive integration test for bug reporting');
    
    const imageFile = createMockFile('test-screenshot.png', 'image/png');
    await user.upload(fileInput, imageFile);
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit bug report/i });
    await user.click(submitButton);
    
    // Verify API was called with correct data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/bug-report', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });
    
    // Verify success message is shown
    await waitFor(() => {
      expect(screen.getByText('Bug report submitted successfully!')).toBeInTheDocument();
    });
    
    // Verify form is cleared
    expect(titleField).toHaveValue('');
    expect(descriptionField).toHaveValue('');
  });

  test('bug report submission handles API errors gracefully', async () => {
    const user = userEvent;
    
    // Mock API error response
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Server temporarily unavailable'
      })
    });

    render(<App />);
    
    // Show the bug report form
    const showFormButton = screen.getByText('Show Bug Report Form');
    await user.click(showFormButton);
    
    // Fill out and submit form
    const titleField = screen.getByLabelText(/title \*/i);
    const descriptionField = screen.getByLabelText(/description \*/i);
    const submitButton = screen.getByRole('button', { name: /submit bug report/i });
    
    await user.type(titleField, 'Test Bug');
    await user.type(descriptionField, 'Test Description');
    await user.click(submitButton);
    
    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText('Server temporarily unavailable')).toBeInTheDocument();
    });
  });

  test('form validation prevents submission with empty required fields', async () => {
    const user = userEvent;

    render(<App />);
    
    // Show the bug report form
    const showFormButton = screen.getByText('Show Bug Report Form');
    await user.click(showFormButton);
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /submit bug report/i });
    await user.click(submitButton);
    
    // Verify validation errors are shown
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    
    // Verify API was not called
    expect(fetch).not.toHaveBeenCalled();
  });

  test('form shows and hides correctly when toggled', async () => {
    const user = userEvent;

    render(<App />);
    
    // Initially form should not be visible
    expect(screen.queryByText('Report a Bug')).not.toBeInTheDocument();
    
    // Show the form
    const showFormButton = screen.getByText('Show Bug Report Form');
    await user.click(showFormButton);
    
    // Form should now be visible
    expect(screen.getByText('Report a Bug')).toBeInTheDocument();
    
    // Hide the form
    const hideFormButton = screen.getByText('Hide Bug Report Form');
    await user.click(hideFormButton);
    
    // Form should be hidden again
    expect(screen.queryByText('Report a Bug')).not.toBeInTheDocument();
  });
});
