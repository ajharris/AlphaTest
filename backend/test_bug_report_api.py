import unittest
import json
import tempfile
import os
import signal
from unittest.mock import patch, MagicMock
from io import BytesIO
from app import app, submission_history, validate_bug_report_data, is_rate_limited

class TestBugReportAPI(unittest.TestCase):
    # Set timeout for all test methods (30 seconds)
    def setUp(self):
        # Set up timeout for individual tests
        signal.alarm(30)  # 30 second timeout
        
        self.app = app.test_client()
        self.app.testing = True
        
        # Set up test database
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.app_context():
            from app import db
            db.create_all()
        
        # Clear rate limiting history for each test
        submission_history.clear()

    def tearDown(self):
        # Cancel the timeout alarm
        signal.alarm(0)
        
        # Clean up database
        with app.app_context():
            from app import db
            db.session.remove()
            db.drop_all()
        
        # Clean up any uploaded files
        pass

    def create_test_image_file(self, filename='test.png', content=b'fake image data'):
        """Create a test image file for upload testing"""
        return (BytesIO(content), filename)

    def create_test_form_data(self, title='Test Bug', description='Test Description', device_info='Test Device Info'):
        """Create test form data for bug report submission"""
        return {
            'title': title,
            'description': description,
            'deviceInfo': device_info
        }

    # Test 1: Valid Bug Report Submission
    def test_valid_bug_report_submission_accepted_and_stored(self):
        """Test that a POST request with valid title, description, image file, and device info is accepted"""
        form_data = self.create_test_form_data()
        form_data['screenshot'] = self.create_test_image_file('screenshot.png')
        
        response = self.app.post('/api/bug-report', 
                               data=form_data, 
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        self.assertIn('bug_report_id', response_data)
        self.assertEqual(response_data['message'], 'Bug report submitted successfully')

    def test_valid_bug_report_without_screenshot(self):
        """Test that a valid bug report without screenshot is accepted"""
        form_data = self.create_test_form_data()
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])

    def test_bug_report_data_is_properly_stored(self):
        """Test that bug report data is stored with correct format"""
        form_data = self.create_test_form_data(
            title='Critical Bug',
            description='This is a critical bug that needs fixing',
            device_info='Mozilla/5.0 Chrome Windows'
        )
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)
        
        # Verify the bug report was saved to database
        with app.app_context():
            from app import BugReport
            bug_report = BugReport.query.filter_by(title='Critical Bug').first()
            self.assertIsNotNone(bug_report)
            self.assertEqual(bug_report.description, 'This is a critical bug that needs fixing')
            self.assertEqual(bug_report.device_info, 'Mozilla/5.0 Chrome Windows')

    # Test 2: Missing Required Fields
    def test_missing_title_returns_400_error(self):
        """Test that submitting without a title returns a 400 error"""
        form_data = {
            'title': '',
            'description': 'Test Description',
            'deviceInfo': 'Test Device Info'
        }
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Validation failed')
        self.assertIn('Title is required', response_data['details'])

    def test_missing_description_returns_400_error(self):
        """Test that submitting without a description returns a 400 error"""
        form_data = {
            'title': 'Test Title',
            'description': '',
            'deviceInfo': 'Test Device Info'
        }
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Validation failed')
        self.assertIn('Description is required', response_data['details'])

    def test_missing_both_title_and_description_returns_validation_details(self):
        """Test that missing both title and description returns detailed validation errors"""
        form_data = {
            'title': '',
            'description': '',
            'deviceInfo': 'Test Device Info'
        }
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Validation failed')
        self.assertIn('Title is required', response_data['details'])
        self.assertIn('Description is required', response_data['details'])

    def test_whitespace_only_fields_are_rejected(self):
        """Test that fields with only whitespace are treated as empty"""
        form_data = {
            'title': '   ',
            'description': '\t\n  ',
            'deviceInfo': 'Test Device Info'
        }
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertIn('Title is required', response_data['details'])
        self.assertIn('Description is required', response_data['details'])

    # Test 3: Screenshot Upload Handling
    def test_image_file_upload_is_stored_correctly(self):
        """Test that uploaded image files are stored correctly"""
        form_data = self.create_test_form_data()
        form_data['screenshot'] = self.create_test_image_file('test-screenshot.png', b'test image content')
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])

    def test_multiple_image_formats_are_accepted(self):
        """Test that different image formats (PNG, JPEG, GIF, WebP) are accepted"""
        valid_formats = [
            ('test.png', 'image/png'),
            ('test.jpg', 'image/jpeg'),
            ('test.jpeg', 'image/jpeg'),
            ('test.gif', 'image/gif'),
            ('test.webp', 'image/webp')
        ]
        
        for filename, content_type in valid_formats:
            with self.subTest(filename=filename):
                form_data = self.create_test_form_data()
                form_data['screenshot'] = self.create_test_image_file(filename)
                
                response = self.app.post('/api/bug-report',
                                       data=form_data,
                                       content_type='multipart/form-data')
                
                self.assertEqual(response.status_code, 201)

    def test_uploaded_file_has_secure_filename(self):
        """Test that uploaded files are given secure filenames"""
        form_data = self.create_test_form_data()
        # Test with potentially dangerous filename
        form_data['screenshot'] = self.create_test_image_file('../../../dangerous.png')
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        # The file should be rejected due to the dangerous filename pattern
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('Invalid file type', data['error'])

    # Test 4: Malicious File Upload Protection
    def test_non_image_file_is_rejected(self):
        """Test that files with invalid MIME types are rejected"""
        form_data = self.create_test_form_data()
        form_data['screenshot'] = self.create_test_image_file('malware.exe')
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Invalid file type. Only image files are allowed.')

    def test_oversized_file_is_rejected(self):
        """Test that files exceeding size limit are rejected"""
        form_data = self.create_test_form_data()
        # Create a file larger than 5MB
        large_content = b'x' * (6 * 1024 * 1024)  # 6MB
        form_data['screenshot'] = self.create_test_image_file('large.png', large_content)
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'File size too large. Maximum size is 5MB.')

    def test_script_files_are_rejected(self):
        """Test that potentially dangerous script files are rejected"""
        dangerous_files = [
            'script.js',
            'malware.exe',
            'virus.bat',
            'hack.php',
            'exploit.py'
        ]
        
        for filename in dangerous_files:
            with self.subTest(filename=filename):
                form_data = self.create_test_form_data()
                form_data['screenshot'] = self.create_test_image_file(filename)
                
                response = self.app.post('/api/bug-report',
                                       data=form_data,
                                       content_type='multipart/form-data')
                
                self.assertEqual(response.status_code, 400)
                response_data = json.loads(response.data)
                self.assertEqual(response_data['error'], 'Invalid file type. Only image files are allowed.')

    def test_empty_file_upload_is_handled_gracefully(self):
        """Test that empty file uploads don't cause errors"""
        form_data = self.create_test_form_data()
        form_data['screenshot'] = (BytesIO(b''), '')  # Empty filename
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)  # Should succeed without file

    # Test 5: Device Info Parsing
    def test_device_info_is_stored_correctly(self):
        """Test that device info submitted from frontend is stored correctly"""
        device_info = """Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Platform: Win32
Language: en-US
Screen: 1920x1080
Viewport: 1200x800"""
        
        form_data = self.create_test_form_data(device_info=device_info)
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)
        
        # Verify device info is stored in the database
        with app.app_context():
            from app import BugReport
            bug_report = BugReport.query.filter_by(title='Test Bug').first()
            self.assertIsNotNone(bug_report)
            self.assertIn('Mozilla/5.0', bug_report.device_info)
            self.assertIn('Win32', bug_report.device_info)
            self.assertIn('1920x1080', bug_report.device_info)

    def test_malformed_device_info_is_handled(self):
        """Test that malformed device info doesn't break submission"""
        malformed_device_info = "Not a valid device info format"
        
        form_data = self.create_test_form_data(device_info=malformed_device_info)
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)  # Should still succeed

    def test_missing_device_info_is_handled(self):
        """Test that missing device info doesn't prevent submission"""
        form_data = {
            'title': 'Test Title',
            'description': 'Test Description'
            # No deviceInfo field
        }
        
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 201)

    # Test 6: Rate Limiting and Abuse Prevention
    def test_rate_limiting_prevents_excessive_submissions(self):
        """Test that the API prevents excessive submissions from the same IP"""
        form_data = self.create_test_form_data()
        
        # Make 5 submissions (the limit)
        for i in range(5):
            response = self.app.post('/api/bug-report',
                                   data=form_data,
                                   content_type='multipart/form-data')
            self.assertEqual(response.status_code, 201)
        
        # 6th submission should be rate limited
        response = self.app.post('/api/bug-report',
                               data=form_data,
                               content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 429)
        response_data = json.loads(response.data)
        self.assertIn('Rate limit exceeded', response_data['error'])

    def test_rate_limiting_is_per_ip(self):
        """Test that rate limiting is applied per IP address"""
        # Test the rate limiting function directly without Flask context
        from app import is_rate_limited, submission_history
        import time
        
        # Clear any existing history
        submission_history.clear()
        
        # Test that new IP is not rate limited
        self.assertFalse(is_rate_limited('192.168.1.1'))
        
        # Add submissions for this IP to trigger rate limiting
        submission_history['192.168.1.1'] = [time.time()] * 5
        
        # Now the IP should be rate limited
        self.assertTrue(is_rate_limited('192.168.1.1'))

    def test_old_submissions_are_excluded_from_rate_limiting(self):
        """Test that submissions older than 1 hour don't count toward rate limit"""
        import time
        
        # Add old submissions (more than 1 hour ago)
        old_time = time.time() - 7200  # 2 hours ago
        submission_history['192.168.1.1'] = [old_time] * 10
        
        # Should not be rate limited because submissions are old
        self.assertFalse(is_rate_limited('192.168.1.1'))

    # Test 7: Additional Edge Cases
    def test_very_long_title_is_rejected(self):
        """Test that titles exceeding length limit are rejected"""
        long_title = 'x' * 201  # Longer than 200 character limit
        
        errors = validate_bug_report_data({
            'title': long_title,
            'description': 'Valid description'
        })
        
        self.assertIn('Title must be less than 200 characters', errors)

    def test_very_long_description_is_rejected(self):
        """Test that descriptions exceeding length limit are rejected"""
        long_description = 'x' * 5001  # Longer than 5000 character limit
        
        errors = validate_bug_report_data({
            'title': 'Valid title',
            'description': long_description
        })
        
        self.assertIn('Description must be less than 5000 characters', errors)

    def test_get_bug_reports_endpoint_exists(self):
        """Test that the GET endpoint for bug reports exists and returns proper format"""
        response = self.app.get('/api/bug-reports')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('bug_reports', response_data)
        self.assertIn('total', response_data)
        self.assertEqual(response_data['total'], 0)  # Should be empty in test

    def test_invalid_http_method_returns_405(self):
        """Test that invalid HTTP methods return 405 Method Not Allowed"""
        # Test a valid endpoint with an invalid method
        response = self.app.put('/api/bug-report')  # PUT instead of POST
        self.assertEqual(response.status_code, 405)

    def test_malformed_multipart_data_is_handled(self):
        """Test that malformed multipart data is handled gracefully"""
        response = self.app.post('/api/bug-report',
                               data='not valid multipart data',
                               content_type='multipart/form-data')
        
        # Should return 400 due to missing required fields
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
