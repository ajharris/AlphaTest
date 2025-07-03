#!/usr/bin/env python3
"""
Populate test data for AlphaTest application
This script creates sample users, repositories, and bug reports for testing
"""

import os
import sys
from datetime import datetime, timedelta
from app import app, db, User, Repository, BugReport

def populate_test_data():
    """Populate the database with test data"""
    
    with app.app_context():
        # Drop and recreate all tables
        print("Dropping existing tables...")
        db.drop_all()
        
        print("Creating new tables...")
        db.create_all()
        
        # Create test users
        print("Creating test users...")
        
        users_data = [
            {
                'github_id': 12345,
                'username': 'testuser1',
                'email': 'testuser1@example.com',
                'avatar_url': 'https://github.com/images/error/testuser1_happy.gif',
                'access_token': 'test_token_1'
            },
            {
                'github_id': 67890,
                'username': 'testuser2',
                'email': 'testuser2@example.com',
                'avatar_url': 'https://github.com/images/error/testuser2_happy.gif',
                'access_token': 'test_token_2'
            },
            {
                'github_id': 11111,
                'username': 'developer',
                'email': 'developer@example.com',
                'avatar_url': 'https://github.com/images/error/developer_happy.gif',
                'access_token': 'test_token_3'
            }
        ]
        
        users = []
        for user_data in users_data:
            user = User(**user_data)
            db.session.add(user)
            users.append(user)
        
        db.session.commit()
        print(f"Created {len(users)} test users")
        
        # Create test repositories
        print("Creating test repositories...")
        
        repositories_data = [
            {
                'github_id': 101,
                'name': 'awesome-project',
                'full_name': 'testuser1/awesome-project',
                'description': 'An awesome project for testing purposes',
                'html_url': 'https://github.com/testuser1/awesome-project',
                'clone_url': 'https://github.com/testuser1/awesome-project.git',
                'language': 'Python',
                'is_private': False,
                'user_id': users[0].id
            },
            {
                'github_id': 102,
                'name': 'react-dashboard',
                'full_name': 'testuser1/react-dashboard',
                'description': 'A React-based dashboard application',
                'html_url': 'https://github.com/testuser1/react-dashboard',
                'clone_url': 'https://github.com/testuser1/react-dashboard.git',
                'language': 'JavaScript',
                'is_private': False,
                'user_id': users[0].id
            },
            {
                'github_id': 201,
                'name': 'mobile-app',
                'full_name': 'testuser2/mobile-app',
                'description': 'A mobile application built with React Native',
                'html_url': 'https://github.com/testuser2/mobile-app',
                'clone_url': 'https://github.com/testuser2/mobile-app.git',
                'language': 'TypeScript',
                'is_private': True,
                'user_id': users[1].id
            },
            {
                'github_id': 202,
                'name': 'api-server',
                'full_name': 'testuser2/api-server',
                'description': 'RESTful API server built with Node.js',
                'html_url': 'https://github.com/testuser2/api-server',
                'clone_url': 'https://github.com/testuser2/api-server.git',
                'language': 'JavaScript',
                'is_private': False,
                'user_id': users[1].id
            },
            {
                'github_id': 301,
                'name': 'dev-tools',
                'full_name': 'developer/dev-tools',
                'description': 'Collection of development tools and utilities',
                'html_url': 'https://github.com/developer/dev-tools',
                'clone_url': 'https://github.com/developer/dev-tools.git',
                'language': 'Go',
                'is_private': False,
                'user_id': users[2].id
            },
            {
                'github_id': 302,
                'name': 'machine-learning-models',
                'full_name': 'developer/machine-learning-models',
                'description': 'Various machine learning models and experiments',
                'html_url': 'https://github.com/developer/machine-learning-models',
                'clone_url': 'https://github.com/developer/machine-learning-models.git',
                'language': 'Python',
                'is_private': True,
                'user_id': users[2].id
            }
        ]
        
        repositories = []
        for repo_data in repositories_data:
            repo = Repository(**repo_data)
            db.session.add(repo)
            repositories.append(repo)
        
        db.session.commit()
        print(f"Created {len(repositories)} test repositories")
        
        # Create test bug reports
        print("Creating test bug reports...")
        
        bug_reports_data = [
            {
                'title': 'Login button not working on mobile',
                'description': 'When trying to login on mobile devices, the login button becomes unresponsive after clicking. This issue occurs consistently on both iOS and Android devices.',
                'device_info': 'Browser: Mobile Safari\nPlatform: iOS 15.6\nScreen: 375x812\nViewport: 375x635',
                'status': 'open',
                'priority': 'high',
                'client_ip': '192.168.1.100',
                'user_id': users[0].id,
                'repository_id': repositories[1].id,
                'created_at': datetime.now() - timedelta(days=2)
            },
            {
                'title': 'Dashboard charts not loading',
                'description': 'The dashboard charts fail to load when there are more than 1000 data points. The loading spinner appears but never completes.',
                'device_info': 'Browser: Chrome 91.0.4472.124\nPlatform: Windows 10\nScreen: 1920x1080\nViewport: 1200x800',
                'status': 'in_progress',
                'priority': 'medium',
                'client_ip': '192.168.1.101',
                'user_id': users[0].id,
                'repository_id': repositories[1].id,
                'created_at': datetime.now() - timedelta(days=1)
            },
            {
                'title': 'API endpoint returns 500 error',
                'description': 'The /api/users endpoint returns a 500 internal server error when queried with specific parameters. Error occurs intermittently.',
                'device_info': 'Server: Node.js v16.14.0\nPlatform: Ubuntu 20.04\nMemory: 4GB\nCPU: 2 cores',
                'status': 'open',
                'priority': 'critical',
                'client_ip': '192.168.1.102',
                'user_id': users[1].id,
                'repository_id': repositories[3].id,
                'created_at': datetime.now() - timedelta(hours=12)
            },
            {
                'title': 'Mobile app crashes on startup',
                'description': 'The mobile app crashes immediately after launch on older Android devices (API level < 26). Works fine on newer devices.',
                'device_info': 'Device: Samsung Galaxy S7\nAndroid: 8.0 (API 26)\nRAM: 4GB\nStorage: 32GB',
                'status': 'open',
                'priority': 'high',
                'client_ip': '192.168.1.103',
                'user_id': users[1].id,
                'repository_id': repositories[2].id,
                'created_at': datetime.now() - timedelta(hours=6)
            },
            {
                'title': 'Memory leak in data processing',
                'description': 'Long-running data processing jobs show continuously increasing memory usage, eventually causing out-of-memory errors.',
                'device_info': 'Runtime: Go 1.19\nPlatform: Linux x86_64\nMemory: 16GB\nCPU: 8 cores',
                'status': 'closed',
                'priority': 'medium',
                'client_ip': '192.168.1.104',
                'user_id': users[2].id,
                'repository_id': repositories[4].id,
                'created_at': datetime.now() - timedelta(days=5)
            },
            {
                'title': 'Model training fails with large datasets',
                'description': 'Training machine learning models fails when dataset size exceeds 10GB. Process terminates without clear error message.',
                'device_info': 'Runtime: Python 3.9\nFramework: TensorFlow 2.8\nGPU: NVIDIA RTX 3080\nVRAM: 10GB',
                'status': 'open',
                'priority': 'low',
                'client_ip': '192.168.1.105',
                'user_id': users[2].id,
                'repository_id': repositories[5].id,
                'created_at': datetime.now() - timedelta(hours=3)
            }
        ]
        
        bug_reports = []
        for report_data in bug_reports_data:
            bug_report = BugReport(**report_data)
            db.session.add(bug_report)
            bug_reports.append(bug_report)
        
        db.session.commit()
        print(f"Created {len(bug_reports)} test bug reports")
        
        print("\n=== Test Data Summary ===")
        print(f"Users: {len(users)}")
        print(f"Repositories: {len(repositories)}")
        print(f"Bug Reports: {len(bug_reports)}")
        print("\nTest data population completed successfully!")
        
        # Print some sample data for verification
        print("\n=== Sample Users ===")
        for user in users:
            print(f"- {user.username} (GitHub ID: {user.github_id})")
        
        print("\n=== Sample Repositories ===")
        for repo in repositories:
            print(f"- {repo.full_name} ({repo.language})")
        
        print("\n=== Sample Bug Reports ===")
        for report in bug_reports:
            print(f"- {report.title} [{report.status}] ({report.priority} priority)")

if __name__ == "__main__":
    try:
        populate_test_data()
    except Exception as e:
        print(f"Error populating test data: {e}")
        sys.exit(1)
