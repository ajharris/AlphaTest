import unittest
import json
from unittest.mock import patch
from app import app, db, User, Repository

class TestRepositoryManagement(unittest.TestCase):
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

    def test_get_user_repositories_not_authenticated(self):
        """Test /api/repositories endpoint when user is not authenticated"""
        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 401)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Not authenticated')

    def test_get_user_repositories_user_not_found(self):
        """Test /api/repositories endpoint when user not found in database"""
        with self.app.session_transaction() as sess:
            sess['github_token'] = 'invalid_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 404)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'User not found')

    @patch('app.requests.get')
    def test_get_user_repositories_github_api_failure(self, mock_get):
        """Test /api/repositories endpoint when GitHub API fails"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()

        # Mock GitHub API failure
        mock_get.return_value.status_code = 500

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Failed to fetch repositories')

    @patch('app.requests.get')
    def test_get_user_repositories_creates_new_repositories(self, mock_get):
        """Test /api/repositories endpoint creates new repositories in database"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        # Mock GitHub API response
        mock_repos_data = [
            {
                'id': 101,
                'name': 'test-repo',
                'full_name': 'testuser/test-repo',
                'description': 'A test repository',
                'html_url': 'https://github.com/testuser/test-repo',
                'clone_url': 'https://github.com/testuser/test-repo.git',
                'language': 'Python',
                'private': False
            },
            {
                'id': 102,
                'name': 'private-repo',
                'full_name': 'testuser/private-repo',
                'description': None,
                'html_url': 'https://github.com/testuser/private-repo',
                'clone_url': 'https://github.com/testuser/private-repo.git',
                'language': 'JavaScript',
                'private': True
            }
        ]
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_repos_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['count'], 2)
        self.assertEqual(len(response_data['repositories']), 2)

        # Verify repositories were created in database
        with app.app_context():
            repos = Repository.query.filter_by(user_id=user_id).all()
            self.assertEqual(len(repos), 2)
            
            repo1 = Repository.query.filter_by(github_id=101).first()
            self.assertIsNotNone(repo1)
            self.assertEqual(repo1.name, 'test-repo')
            self.assertEqual(repo1.description, 'A test repository')
            self.assertEqual(repo1.language, 'Python')
            self.assertFalse(repo1.is_private)
            
            repo2 = Repository.query.filter_by(github_id=102).first()
            self.assertIsNotNone(repo2)
            self.assertEqual(repo2.name, 'private-repo')
            self.assertIsNone(repo2.description)
            self.assertEqual(repo2.language, 'JavaScript')
            self.assertTrue(repo2.is_private)

    @patch('app.requests.get')
    def test_get_user_repositories_updates_existing_repositories(self, mock_get):
        """Test /api/repositories endpoint updates existing repositories"""
        # Create user and existing repository in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()
            
            existing_repo = Repository(
                github_id=101,
                name='old-name',
                full_name='testuser/old-name',
                description='Old description',
                html_url='https://github.com/testuser/old-name',
                language='Java',
                is_private=True,
                user_id=user.id
            )
            db.session.add(existing_repo)
            db.session.commit()
            user_id = user.id

        # Mock GitHub API response with updated data
        mock_repos_data = [
            {
                'id': 101,
                'name': 'new-name',
                'full_name': 'testuser/new-name',
                'description': 'New description',
                'html_url': 'https://github.com/testuser/new-name',
                'clone_url': 'https://github.com/testuser/new-name.git',
                'language': 'Python',
                'private': False
            }
        ]
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_repos_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 200)

        # Verify repository was updated in database
        with app.app_context():
            repo = Repository.query.filter_by(github_id=101).first()
            self.assertIsNotNone(repo)
            self.assertEqual(repo.name, 'new-name')
            self.assertEqual(repo.full_name, 'testuser/new-name')
            self.assertEqual(repo.description, 'New description')
            self.assertEqual(repo.language, 'Python')
            self.assertFalse(repo.is_private)

    @patch('app.requests.get')
    def test_get_user_repositories_handles_empty_response(self, mock_get):
        """Test /api/repositories endpoint handles empty repository list"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()

        # Mock GitHub API response with empty list
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = []

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['count'], 0)
        self.assertEqual(len(response_data['repositories']), 0)

    @patch('app.requests.get')
    def test_get_user_repositories_handles_missing_fields(self, mock_get):
        """Test /api/repositories endpoint handles repositories with missing optional fields"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        # Mock GitHub API response with minimal data
        mock_repos_data = [
            {
                'id': 101,
                'name': 'minimal-repo',
                'full_name': 'testuser/minimal-repo',
                'html_url': 'https://github.com/testuser/minimal-repo',
                'private': False
                # Missing: description, clone_url, language
            }
        ]
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_repos_data

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 200)

        # Verify repository was created with None values for missing fields
        with app.app_context():
            repo = Repository.query.filter_by(github_id=101).first()
            self.assertIsNotNone(repo)
            self.assertEqual(repo.name, 'minimal-repo')
            self.assertIsNone(repo.description)
            self.assertIsNone(repo.clone_url)
            self.assertIsNone(repo.language)

    @patch('app.requests.get')
    def test_get_user_repositories_handles_api_exception(self, mock_get):
        """Test /api/repositories endpoint handles general exceptions"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()

        # Mock exception during API call
        mock_get.side_effect = Exception('Connection timeout')

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.data)
        self.assertIn('error', response_data)

    @patch('app.requests.get')
    def test_get_user_repositories_correct_api_call(self, mock_get):
        """Test /api/repositories endpoint makes correct API call to GitHub"""
        # Create user in database
        with app.app_context():
            user = User(
                github_id=12345,
                username='testuser',
                access_token='test_token'
            )
            db.session.add(user)
            db.session.commit()

        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = []

        with self.app.session_transaction() as sess:
            sess['github_token'] = 'test_token'

        response = self.app.get('/api/repositories')
        
        # Verify correct API call was made
        mock_get.assert_called_once_with(
            'https://api.github.com/user/repos?per_page=100&sort=updated',
            headers={'Authorization': 'token test_token'}
        )

if __name__ == '__main__':
    unittest.main()
