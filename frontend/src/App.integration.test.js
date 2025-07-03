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
    
    // Mock auth check API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { login: 'testuser' },
        access_token: 'test_token'
      })
    });

    // Mock GitHub repos API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { 
          id: 1, 
          name: 'test-repo', 
          full_name: 'testuser/test-repo',
          owner: { login: 'testuser' }
        }
      ])
    });

    // Mock successful bug report submission
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bug_report_id: 'bug_12345',
        message: 'Bug report submitted successfully'
      })
    });

    render(<App />);
    
    // Wait for authentication and repo loading to complete
    await waitFor(() => {
      expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
    });
    
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
    
    // Mock auth check to return unauthenticated
    fetch.mockResolvedValueOnce({
      ok: false
    });

    // Mock API error response for bug report submission
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Server temporarily unavailable'
      })
    });

    render(<App />);
    
    // Show the bug report form
    await waitFor(() => {
      expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
    });
    
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

    // Mock auth check to return unauthenticated  
    fetch.mockResolvedValueOnce({
      ok: false
    });

    render(<App />);
    
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
    });
    
    // Show the bug report form
    const showFormButton = screen.getByText('Show Bug Report Form');
    await user.click(showFormButton);
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /submit bug report/i });
    await user.click(submitButton);
    
    // Verify validation errors are shown
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    
    // Verify only auth API was called (for the initial check)
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      credentials: 'include'
    }));
  });

  test('form shows and hides correctly when toggled', async () => {
    const user = userEvent;

    // Mock auth check to return unauthenticated
    fetch.mockResolvedValueOnce({
      ok: false
    });

    render(<App />);
    
    // Wait for auth check and initial render
    await waitFor(() => {
      expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
    });
    
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
