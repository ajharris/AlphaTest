// Jest setup file to mock environment variables for frontend tests
beforeAll(() => {
  process.env.REACT_APP_GITHUB_CLIENT_ID = 'Ov23liljtYeoau240WhB';
  process.env.REACT_APP_GITHUB_REDIRECT_URI = 'http://127.0.0.1:5000/github/callback';
});
