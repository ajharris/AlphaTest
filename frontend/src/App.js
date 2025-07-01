import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import BugReportForm from './BugReportForm';

function App() {
  const [showBugReport, setShowBugReport] = useState(false);

  useEffect(() => {
    // If redirected back with ?dashboard, go to dashboard
    if (window.location.search.includes('dashboard')) {
      window.location.href = '/dashboard';
    }
  }, []);

  const handleLogin = () => {
    window.location.assign('/login/github');
  };

  const handleBugReportSubmit = async (formData) => {
    // Create FormData object for file upload
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('deviceInfo', JSON.stringify(formData.deviceInfo));
    
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
        <button onClick={handleLogin}>Login with GitHub</button>
        <button onClick={() => setShowBugReport(!showBugReport)}>
          {showBugReport ? 'Hide' : 'Show'} Bug Report Form
        </button>
      </header>
      
      {showBugReport && (
        <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
          <BugReportForm onSubmit={handleBugReportSubmit} />
        </div>
      )}
    </div>
  );
}

export default App;
