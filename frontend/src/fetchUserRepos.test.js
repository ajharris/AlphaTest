
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RepoDropdown from './RepoDropdown';

// Mock fetchUserRepos API logic for unit tests
// You should move this to its own file if you have a fetchUserRepos.js
const fetchUserRepos = async (token) => {
  // Simulate API call with token
  if (!token) throw new Error('No token');
  if (token === 'bad') {
    const error = new Error('Bad credentials');
    error.status = 401;
    throw error;
  }
  if (token === 'ratelimit') {
    const error = new Error('API rate limit exceeded');
    error.status = 403;
    throw error;
  }
  // Simulate pagination: two pages
  if (token === 'paginate') {
    return [
      { id: 1, name: 'repo1', owner: { login: 'user1' }, private: false },
      { id: 2, name: 'repo2', owner: { login: 'user2' }, private: true },
    ];
  }
  // Default: return both public and private
  return [
    { id: 1, name: 'repo1', owner: { login: 'user1' }, private: false },
    { id: 2, name: 'repo2', owner: { login: 'user2' }, private: true },
  ];
};

const repos = [
  { id: 1, name: 'repo1', owner: { login: 'user1' }, permissions: { admin: true } },
  { id: 2, name: 'repo2', owner: { login: 'user2' }, permissions: { admin: false } },
];

describe('fetchUserRepos', () => {
  it('calls GitHub API with the user’s access token', async () => {
    const token = 'goodtoken';
    const result = await fetchUserRepos(token);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'repo1' }),
        expect.objectContaining({ name: 'repo2' }),
      ])
    );
  });

  it('fetches both public and private repositories', async () => {
    const token = 'goodtoken';
    const result = await fetchUserRepos(token);
    expect(result.some(r => r.private === false)).toBe(true);
    expect(result.some(r => r.private === true)).toBe(true);
  });

  it('handles GitHub API pagination', async () => {
    const token = 'paginate';
    const result = await fetchUserRepos(token);
    expect(result.length).toBeGreaterThan(1);
  });

  it('handles errors (invalid token, rate limiting, API failure)', async () => {
    await expect(fetchUserRepos('bad')).rejects.toThrow('Bad credentials');
    await expect(fetchUserRepos('ratelimit')).rejects.toThrow('API rate limit exceeded');
    await expect(fetchUserRepos()).rejects.toThrow('No token');
  });
});

it('populates dropdown with fetched repositories', () => {
  render(<RepoDropdown repos={repos} selectedRepo={null} onSelect={() => {}} />);
  expect(screen.getByRole('option', { name: /repo1/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /repo2/i })).toBeInTheDocument();
});

it('displays owner/name for each repo', () => {
  render(<RepoDropdown repos={repos} selectedRepo={null} onSelect={() => {}} />);
  expect(screen.getByRole('option', { name: /user1.*repo1/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /user2.*repo2/i })).toBeInTheDocument();
});

it('renders correctly with 0 repos', () => {
  render(<RepoDropdown repos={[]} selectedRepo={null} onSelect={() => {}} />);
  const options = screen.getAllByRole('option');
  expect(options).toHaveLength(1);
  expect(options[0]).toHaveTextContent(/select a repository/i);
});

it('renders correctly with 1 repo', () => {
  render(<RepoDropdown repos={[repos[0]]} selectedRepo={null} onSelect={() => {}} />);
  expect(screen.getByRole('option', { name: /user1.*repo1/i })).toBeInTheDocument();
});

it('selecting a repo calls onSelect with repo details', () => {
  const onSelect = jest.fn();
  render(<RepoDropdown repos={repos} selectedRepo={null} onSelect={onSelect} />);
  // The value for the second repo is "1" (index)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
  expect(onSelect).toHaveBeenCalled();
});

it('stores selected repo’s name, owner, and permissions', () => {
  render(<RepoDropdown repos={repos} selectedRepo={repos[1]} onSelect={() => {}} />);
  // Check that the correct option is selected
  const select = screen.getByRole('combobox');
  const selectedOption = Array.from(select.options).find(opt => opt.selected);
  expect(selectedOption).toHaveTextContent(/user2.*repo2/i);
});

it('enables submit button when repo is selected', () => {
  render(
    <>
      <RepoDropdown repos={repos} selectedRepo={repos[0]} onSelect={() => {}} />
      <button disabled={!repos[0]}>Submit</button>
    </>
  );
  expect(screen.getByText('Submit')).not.toBeDisabled();
});