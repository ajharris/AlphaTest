import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Import the fetchAllRepos function - we need to extract it for testing
// Since it's not exported, we'll create a test version
async function fetchAllRepos(token) {
  let repos = [];
  let url = 'https://api.github.com/user/repos?per_page=100&visibility=all';
  let headers = { Authorization: `token ${token}` };
  while (url) {
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw resp;
    const data = await resp.json();
    repos = repos.concat(data);
    // Parse Link header for pagination
    const link = resp.headers.get('link');
    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>; rel="next"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }
  return repos;
}

// Mock fetch for testing
global.fetch = jest.fn();

describe('fetchAllRepos Unit Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Single Page Response', () => {
    test('fetches repositories from single page successfully', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', owner: { login: 'user1' } },
        { id: 2, name: 'repo2', owner: { login: 'user1' } }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
        headers: {
          get: () => null // No Link header means no pagination
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?per_page=100&visibility=all',
        { headers: { Authorization: 'token test-token' } }
      );
      expect(result).toEqual(mockRepos);
    });
  });

  describe('Pagination', () => {
    test('handles pagination correctly with multiple pages', async () => {
      const page1Repos = [
        { id: 1, name: 'repo1', owner: { login: 'user1' } },
        { id: 2, name: 'repo2', owner: { login: 'user1' } }
      ];

      const page2Repos = [
        { id: 3, name: 'repo3', owner: { login: 'user1' } },
        { id: 4, name: 'repo4', owner: { login: 'user1' } }
      ];

      // First page response with Link header
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page1Repos,
        headers: {
          get: (header) => {
            if (header === 'link') {
              return '<https://api.github.com/user/repos?per_page=100&visibility=all&page=2>; rel="next", <https://api.github.com/user/repos?per_page=100&visibility=all&page=2>; rel="last"';
            }
            return null;
          }
        }
      });

      // Second page response without Link header (last page)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page2Repos,
        headers: {
          get: () => null
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1,
        'https://api.github.com/user/repos?per_page=100&visibility=all',
        { headers: { Authorization: 'token test-token' } }
      );
      expect(fetch).toHaveBeenNthCalledWith(2,
        'https://api.github.com/user/repos?per_page=100&visibility=all&page=2',
        { headers: { Authorization: 'token test-token' } }
      );
      expect(result).toEqual([...page1Repos, ...page2Repos]);
    });

    test('handles three pages of pagination', async () => {
      const page1 = [{ id: 1, name: 'repo1' }];
      const page2 = [{ id: 2, name: 'repo2' }];
      const page3 = [{ id: 3, name: 'repo3' }];

      // Page 1
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
        headers: {
          get: () => '<https://api.github.com/user/repos?page=2>; rel="next"'
        }
      });

      // Page 2
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
        headers: {
          get: () => '<https://api.github.com/user/repos?page=3>; rel="next"'
        }
      });

      // Page 3 (last page)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page3,
        headers: {
          get: () => null
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual([...page1, ...page2, ...page3]);
    });

    test('handles malformed Link header gracefully', async () => {
      const mockRepos = [{ id: 1, name: 'repo1' }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
        headers: {
          get: () => 'invalid-link-header'
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRepos);
    });

    test('handles Link header without next relation', async () => {
      const mockRepos = [{ id: 1, name: 'repo1' }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
        headers: {
          get: () => '<https://api.github.com/user/repos?page=1>; rel="prev", <https://api.github.com/user/repos?page=1>; rel="first"'
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRepos);
    });
  });

  describe('Error Handling', () => {
    test('throws error when API returns 401 Unauthorized', async () => {
      const mockError = new Error('Unauthorized');
      mockError.status = 401;

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(fetchAllRepos('invalid-token')).rejects.toMatchObject({
        ok: false,
        status: 401
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('throws error when API returns 403 Forbidden (rate limited)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      await expect(fetchAllRepos('test-token')).rejects.toMatchObject({
        ok: false,
        status: 403
      });
    });

    test('throws error when API returns 404 Not Found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(fetchAllRepos('test-token')).rejects.toMatchObject({
        ok: false,
        status: 404
      });
    });

    test('throws error when API returns 500 Internal Server Error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchAllRepos('test-token')).rejects.toMatchObject({
        ok: false,
        status: 500
      });
    });

    test('handles network error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchAllRepos('test-token')).rejects.toThrow('Network error');
    });

    test('handles error on second page of pagination', async () => {
      const page1 = [{ id: 1, name: 'repo1' }];

      // First page succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
        headers: {
          get: () => '<https://api.github.com/user/repos?page=2>; rel="next"'
        }
      });

      // Second page fails
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchAllRepos('test-token')).rejects.toMatchObject({
        ok: false,
        status: 500
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty Responses', () => {
    test('handles empty repository list', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: {
          get: () => null
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(result).toEqual([]);
    });

    test('handles pagination with empty pages', async () => {
      // First page has repos
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'repo1' }],
        headers: {
          get: () => '<https://api.github.com/user/repos?page=2>; rel="next"'
        }
      });

      // Second page is empty
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: {
          get: () => null
        }
      });

      const result = await fetchAllRepos('test-token');

      expect(result).toEqual([{ id: 1, name: 'repo1' }]);
    });
  });

  describe('Authorization Header', () => {
    test('includes correct authorization header format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: { get: () => null }
      });

      await fetchAllRepos('my-secret-token');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?per_page=100&visibility=all',
        { headers: { Authorization: 'token my-secret-token' } }
      );
    });

    test('handles different token formats', async () => {
      const tokens = [
        'github_pat_123abc',
        'ghp_123abc',
        'gho_123abc',
        'simple-token'
      ];

      for (const token of tokens) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
          headers: { get: () => null }
        });

        await fetchAllRepos(token);

        expect(fetch).toHaveBeenLastCalledWith(
          expect.any(String),
          { headers: { Authorization: `token ${token}` } }
        );
      }
    });
  });

  describe('API URL Construction', () => {
    test('uses correct base URL and parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: { get: () => null }
      });

      await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?per_page=100&visibility=all',
        expect.any(Object)
      );
    });

    test('follows pagination URLs correctly', async () => {
      // First page
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1 }],
        headers: {
          get: () => '<https://api.github.com/user/repos?per_page=100&visibility=all&page=2&sort=updated>; rel="next"'
        }
      });

      // Second page with complex URL
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 2 }],
        headers: { get: () => null }
      });

      await fetchAllRepos('test-token');

      expect(fetch).toHaveBeenNthCalledWith(2,
        'https://api.github.com/user/repos?per_page=100&visibility=all&page=2&sort=updated',
        { headers: { Authorization: 'token test-token' } }
      );
    });
  });
});
