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

export default function RepoDropdown({ token, onSelect }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
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
  }, [token]);

  const handleChange = e => {
    const idx = e.target.value;
    const repo = repos[idx];
    setSelected(repo);
    if (onSelect) onSelect(repo);
  };

  return (
    <div>
      {loading && <span>Loading...</span>}
      {error && <span role="alert">{error}</span>}
      <select data-testid="repo-dropdown" onChange={handleChange} disabled={loading || !!error}>
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
  token: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
};
