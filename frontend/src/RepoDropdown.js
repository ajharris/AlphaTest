import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// Helper to fetch all repos with pagination
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

export default function RepoDropdown({ token, repos: reposProp, selectedRepo, onSelect }) {
  const [repos, setRepos] = useState(reposProp || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(selectedRepo || null);

  useEffect(() => {
    if (reposProp) {
      setRepos(reposProp);
      return;
    }
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchAllRepos(token)
      .then(setRepos)
      .catch(err => {
        if (err.status === 401) setError('Invalid token');
        else if (err.status === 403) setError('Rate limited');
        else setError('Failed to fetch repositories');
      })
      .finally(() => setLoading(false));
  }, [token, reposProp]);

  useEffect(() => {
    if (selectedRepo) setSelected(selectedRepo);
  }, [selectedRepo]);

  const handleChange = e => {
    const idx = e.target.value;
    // Defensive: idx may be '' if placeholder is selected
    const repo = idx !== '' ? repos[idx] : null;
    setSelected(repo);
    if (onSelect && repo) onSelect(repo);
  };

  return (
    <div>
      {loading && <span className="loading">Loading repositories...</span>}
      {error && <span className="error" role="alert">{error}</span>}
      <select
        data-testid="repo-dropdown"
        onChange={handleChange}
        disabled={loading || !!error}
        value={selected ? repos.findIndex(r => r.id === selected.id) : ''}
        role="combobox"
      >
        <option value="">Select a repository</option>
        {repos.map((repo, i) => (
          <option key={repo.id} value={i}>
            {repo.owner.login}/{repo.name}
          </option>
        ))}
      </select>
    </div>
  );
}

RepoDropdown.propTypes = {
  token: PropTypes.string,
  repos: PropTypes.array,
  selectedRepo: PropTypes.object,
  onSelect: PropTypes.func,
};
