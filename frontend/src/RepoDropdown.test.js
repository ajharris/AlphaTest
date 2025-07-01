import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RepoDropdown from './RepoDropdown';

const mockReposPage1 = [
  { id: 1, name: 'repo1', owner: { login: 'user' }, private: false, permissions: { admin: true } },
  { id: 2, name: 'repo2', owner: { login: 'user' }, private: true, permissions: { admin: false } },
];
const mockReposPage2 = [
  { id: 3, name: 'repo3', owner: { login: 'user' }, private: false, permissions: { admin: true } },
];

function mockFetchSequence(responses) {
  let call = 0;
  global.fetch = jest.fn(() => {
    const resp = responses[call++];
    return Promise.resolve(resp);
  });
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('RepoDropdown', () => {
  const token = 'test-token';

  test('calls GitHub API with user access token', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('user/repos'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `token ${token}` }) })
    ));
  });

  test('fetches both public and private repositories', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockReposPage1),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByTestId('repo-dropdown').children.length).toBe(3));
    expect(screen.getByText('user/repo1')).toBeInTheDocument();
    expect(screen.getByText('user/repo2')).toBeInTheDocument();
  });

  test('handles GitHub API pagination', async () => {
    mockFetchSequence([
      {
        ok: true,
        json: () => Promise.resolve(mockReposPage1),
        headers: { get: () => '<http://nextpage>; rel="next"' },
      },
      {
        ok: true,
        json: () => Promise.resolve(mockReposPage2),
        headers: { get: () => null },
      },
    ]);
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByText('user/repo3')).toBeInTheDocument());
    expect(screen.getAllByRole('option').length).toBe(4); // 1 placeholder + 3 repos
  });

  test('handles invalid token error', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Bad credentials' }),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid token'));
  });

  test('handles rate limiting error', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: 'API rate limit exceeded' }),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Rate limited'));
  });

  test('handles generic API failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Server error' }),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch repositories'));
  });

  test('dropdown renders correctly with 0 repos', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByTestId('repo-dropdown')).toBeInTheDocument());
    expect(screen.getAllByRole('option').length).toBe(1); // Only placeholder
  });

  test('dropdown renders correctly with 1 repo', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([mockReposPage1[0]]),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} />);
    await waitFor(() => expect(screen.getByText('user/repo1')).toBeInTheDocument());
    expect(screen.getAllByRole('option').length).toBe(2);
  });

  test('selecting a repo sets context and calls onSelect', async () => {
    const onSelect = jest.fn();
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockReposPage1),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} onSelect={onSelect} />);
    await waitFor(() => expect(screen.getByText('user/repo2')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('repo-dropdown'), { target: { value: '1' } });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      name: 'repo2',
      owner: { login: 'user' },
      permissions: { admin: false },
    }));
  });

  test('selected repo details are correct', async () => {
    let selectedRepo = null;
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockReposPage1),
      headers: { get: () => null },
    }));
    render(<RepoDropdown token={token} onSelect={repo => { selectedRepo = repo; }} />);
    await waitFor(() => expect(screen.getByText('user/repo2')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('repo-dropdown'), { target: { value: '1' } });
    expect(selectedRepo).toMatchObject({
      name: 'repo2',
      owner: { login: 'user' },
      permissions: { admin: false },
    });
  });

  test('dependent component (submit button) enables on repo select', async () => {
    function Wrapper() {
      const [selected, setSelected] = React.useState(null);
      return (
        <>
          <RepoDropdown token={token} onSelect={setSelected} />
          <button disabled={!selected} data-testid="submit-btn">Submit</button>
        </>
      );
    }
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockReposPage1),
      headers: { get: () => null },
    }));
    render(<Wrapper />);
    await waitFor(() => expect(screen.getByText('user/repo2')).toBeInTheDocument());
    const dropdown = screen.getByTestId('repo-dropdown');
    const submitBtn = screen.getByTestId('submit-btn');
    expect(submitBtn).toBeDisabled();
    fireEvent.change(dropdown, { target: { value: '1' } });
    expect(submitBtn).not.toBeDisabled();
  });
});


// Removed fetchUserRepos tests as they are not defined in this file

// ...existing code...

// Removed fetchUserRepos API tests: these belong in fetchUserRepos.test.js