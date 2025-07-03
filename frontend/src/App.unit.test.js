import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock window.location
delete window.location;
window.location = { assign: jest.fn(), href: '', search: '' };

describe('App Unit Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    window.location.assign.mockClear();
    window.location.href = '';
    window.location.search = '';
  });

  describe('fetchRepositories function', () => {
    test('successfully fetches and sets repositories', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', owner: { login: 'user1' } },
        { id: 2, name: 'repo2', owner: { login: 'user1' } }
      ];

      // Mock auth response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { login: 'testuser' },
          access_token: 'test_token'
        })
      });

      // Mock repos response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos
      });

      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: {
            'Authorization': 'token test_token',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
      });

      // Check that repos are loaded in the dropdown
      await waitFor(() => {
        expect(screen.getByText('user1/repo1')).toBeInTheDocument();
        expect(screen.getByText('user1/repo2')).toBeInTheDocument();
      });
    });

    test('handles repository fetch failure gracefully', async () => {
      // Mock auth response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { login: 'testuser' },
          access_token: 'test_token'
        })
      });

      // Mock repos failure - this should not log an error, just fail silently
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(<App />);

      // Wait for auth to complete
      await waitFor(() => {
        expect(screen.getByText(/Welcome, testuser!/)).toBeInTheDocument();
      });

      // The repos dropdown should be empty (no repos loaded)
      await waitFor(() => {
        const dropdown = screen.getByTestId('repo-dropdown');
        expect(dropdown.children).toHaveLength(1); // Only the "Select a repository" option
      });
    });

    test('handles network error during repository fetch', async () => {
      // Mock auth response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { login: 'testuser' },
          access_token: 'test_token'
        })
      });

      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch repositories:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('handleLogin function', () => {
    test('redirects to GitHub OAuth URL', () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      render(<App />);

      const loginButton = screen.getByText('Login with GitHub');
      userEvent.click(loginButton);

      expect(window.location.assign).toHaveBeenCalledWith('/login/github');
    });
  });

  describe('checkAuthStatus function', () => {
    test('handles authentication check failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles network error during auth check', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to check auth status:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('dashboard redirect logic', () => {
    test('redirects to dashboard when URL contains dashboard parameter', () => {
      window.location.search = '?dashboard=true';
      
      render(<App />);

      expect(window.location.href).toBe('/dashboard');
    });
  });

  describe('handleRepoSelect function', () => {
    test('sets selected repository and logs selection', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', owner: { login: 'user1' } }
      ];

      // Mock auth response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { login: 'testuser' },
          access_token: 'test_token'
        })
      });

      // Mock repos response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos
      });

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('user1/repo1')).toBeInTheDocument();
      });

      // Select a repository
      const dropdown = screen.getByTestId('repo-dropdown');
      await userEvent.selectOptions(dropdown, '0');

      await waitFor(() => {
        expect(screen.getByText('Selected: user1/repo1')).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith('Selected repository:', mockRepos[0]);
      });

      consoleSpy.mockRestore();
    });
  });
});
