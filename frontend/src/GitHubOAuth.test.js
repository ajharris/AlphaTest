import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock window.location.assign and window.location.search
delete window.location;
window.location = { assign: jest.fn(), search: '' };

describe('GitHub OAuth Login', () => {
  test("Clicking 'Login with GitHub' initiates OAuth flow", () => {
    render(<App />);
    const loginButton = screen.getByRole('button', { name: /login with github/i });
    fireEvent.click(loginButton);
    expect(window.location.assign).toHaveBeenCalledWith('/login/github');
  });
});
