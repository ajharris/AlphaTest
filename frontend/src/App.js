import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import BugReportForm from './BugReportForm';
import RepoDropdown from './RepoDropdown';

function App() {
  const [showBugReport, setShowBugReport] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // If redirected back with ?dashboard, go to dashboard
    if (window.location.search.includes('dashboard')) {
      window.location.href = '/dashboard';
    }

    // Check if user is authenticated
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        setUser(userData.user);
        setAccessToken(userData.access_token);
        // Fetch repositories after authentication
        await fetchRepositories(userData.access_token);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const fetchRepositories = async (token) => {
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const reposData = await response.json();
        setRepos(reposData);
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    console.log('Selected repository:', repo);
  };

  const handleLogin = () => {
    window.location.assign('/login/github');
  };

  const handleBugReportSubmit = async (formData) => {
    // Create FormData object for file upload
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('deviceInfo', JSON.stringify(formData.deviceInfo));
    
    if (formData.repository_id) {
      submitData.append('repository_id', formData.repository_id);
    }
    
    if (formData.screenshot) {
      submitData.append('screenshot', formData.screenshot);
    }

    const response = await fetch('/api/bug-report', {
      method: 'POST',
      body: submitData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit bug report');
    }

    return response.json();
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        
        {!isAuthenticated ? (
          <button onClick={handleLogin}>Login with GitHub</button>
        ) : (
          <div>
            <p>Welcome, {user?.login || 'User'}!</p>
            
            {/* Repository Dropdown */}
            <div className="repo-dropdown-container">
              <h3>Select a Repository:</h3>
              <RepoDropdown
                repos={repos}
                selectedRepo={selectedRepo}
                onSelect={handleRepoSelect}
                token={accessToken}
              />
              {selectedRepo && (
                <div className="selected-repo">
                  Selected: {selectedRepo.owner.login}/{selectedRepo.name}
                </div>
              )}
            </div>
          </div>
        )}
        
        <button onClick={() => setShowBugReport(!showBugReport)}>
          {showBugReport ? 'Hide' : 'Show'} Bug Report Form
        </button>
      </header>
      
      {showBugReport && (
        <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
          <BugReportForm onSubmit={handleBugReportSubmit} selectedRepo={selectedRepo} />
        </div>
      )}
    </div>
  );
}

export default App;
