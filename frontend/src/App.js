import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  useEffect(() => {
    // If redirected back with ?dashboard, go to dashboard
    if (window.location.search.includes('dashboard')) {
      window.location.href = '/dashboard';
    }
  }, []);

  const handleLogin = () => {
    window.location.assign('/login/github');
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
      </header>
    </div>
  );
}

export default App;
