import unittest
from unittest.mock import patch, MagicMock
from app import app

class TestGitHubOAuth(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('requests.post')
    def test_github_callback_exchanges_code_and_stores_token(self, mock_post):
        # Simulate GitHub returning an access token
        mock_post.return_value.json.return_value = {'access_token': 'fake-token'}
        mock_post.return_value.status_code = 200
        with self.app.session_transaction() as sess:
            pass  # session setup if needed
        response = self.app.get('/github/callback?code=fakecode')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/dashboard', response.location)
        # Check token is stored (e.g., in session)
        with self.app.session_transaction() as sess:
            self.assertEqual(sess.get('github_token'), 'fake-token')

    def test_dashboard_requires_authentication(self):
        response = self.app.get('/dashboard')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.location)

if __name__ == '__main__':
    unittest.main()
