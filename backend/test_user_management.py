import unittest
import json
from unittest.mock import patch, MagicMock
from app import app, db, User, Repository

class TestUserManagement(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        
        # Set up test database
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_get_current_user_not_authenticated(self):
        """Test /api/user endpoint when user is not authenticated"""
        response = self.app.get('/api/user')
        
        self.assertEqual(response.status_code, 401)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Not authenticated')

    @patch('app.requests.get')
    def test_get_current_user_github_api_failure(self, mock_get):
        """Test /api/user endpoint when GitHub API fails"""
        # Mock GitHub API failure
        mock_get.return_value.status_code = 401

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/user')
        
        self.assertEqual(response.status_code, 401)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Failed to fetch user data')

    @patch('app.requests.get')
    def test_get_current_user_creates_new_user(self, mock_get):
        """Test /api/user endpoint creates new user in database"""
        # Mock GitHub API response
        mock_user_data = {
            'id': 12345,
            'login': 'testuser',
            'email': 'test@example.com',
            'avatar_url': 'https://github.com/images/error/testuser_happy.gif'
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_user_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/user')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['user']['login'], 'testuser')
        self.assertEqual(response_data['access_token'], 'test_token')

        # Verify user was created in database
        with app.app_context():
            user = User.query.filter_by(github_id=12345).first()
            self.assertIsNotNone(user)
            self.assertEqual(user.username, 'testuser')
            self.assertEqual(user.email, 'test@example.com')
            self.assertEqual(user.access_token, 'test_token')

    @patch('app.requests.get')
    def test_get_current_user_updates_existing_user(self, mock_get):
        """Test /api/user endpoint updates existing user"""
        # Create existing user
        with app.app_context():
            existing_user = User(
                github_id=12345,
                username='oldusername',
                email='old@example.com',
                avatar_url='old_avatar.gif',
                access_token='old_token'
            )
            db.session.add(existing_user)
            db.session.commit()

        # Mock GitHub API response with updated data
        mock_user_data = {
            'id': 12345,
            'login': 'newusername',
            'email': 'new@example.com',
            'avatar_url': 'new_avatar.gif'
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_user_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'new_token'

        response = self.app.get('/api/user')
        
        self.assertEqual(response.status_code, 200)

        # Verify user was updated in database
        with app.app_context():
            user = User.query.filter_by(github_id=12345).first()
            self.assertIsNotNone(user)
            self.assertEqual(user.username, 'newusername')
            self.assertEqual(user.email, 'new@example.com')
            self.assertEqual(user.avatar_url, 'new_avatar.gif')
            self.assertEqual(user.access_token, 'new_token')

    @patch('app.requests.get')
    def test_get_current_user_handles_missing_email(self, mock_get):
        """Test /api/user endpoint handles missing email field"""
        mock_user_data = {
            'id': 12345,
            'login': 'testuser',
            'avatar_url': 'avatar.gif'
            # No email field
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_user_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/user')
        
        self.assertEqual(response.status_code, 200)

        # Verify user was created with None email
        with app.app_context():
            user = User.query.filter_by(github_id=12345).first()
            self.assertIsNotNone(user)
            self.assertIsNone(user.email)

    def test_get_user_info_not_authenticated(self):
        """Test /me endpoint when user is not authenticated"""
        response = self.app.get('/me')
        
        self.assertEqual(response.status_code, 302)  # Redirect
        self.assertIn('/login/github', response.location)

    @patch('app.requests.get')
    def test_get_user_info_github_api_failure(self, mock_get):
        """Test /me endpoint when GitHub API fails"""
        mock_get.return_value.status_code = 401

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/me')
        
        self.assertEqual(response.status_code, 302)  # Redirect
        self.assertIn('error=failed_to_fetch_user', response.location)

    @patch('app.requests.get')
    def test_get_user_info_success(self, mock_get):
        """Test /me endpoint returns user data successfully"""
        mock_user_data = {
            'id': 12345,
            'login': 'testuser',
            'email': 'test@example.com'
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_user_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/me')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['login'], 'testuser')

if __name__ == '__main__':
    unittest.main()
