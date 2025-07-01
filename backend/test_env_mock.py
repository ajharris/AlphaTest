# Pytest fixture to mock environment variables for backend tests
import os
import pytest

@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    monkeypatch.setenv('FLASK_SECRET_KEY', 'dev-secret')
    monkeypatch.setenv('GITHUB_CLIENT_ID', 'Ov23liljtYeoau240WhB')
    monkeypatch.setenv('GITHUB_CLIENT_SECRET', '666c35d6413c6611e7ef5911b96a5b2eeb258e58')
    monkeypatch.setenv('GITHUB_REDIRECT_URI', 'http://127.0.0.1:5000/github/callback')
