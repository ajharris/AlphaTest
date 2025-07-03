import unittest
from app import allowed_file, validate_bug_report_data

class TestUtilityFunctions(unittest.TestCase):
    
    def test_allowed_file_valid_extensions(self):
        """Test allowed_file function with valid image extensions"""
        valid_files = [
            'image.jpg',
            'photo.jpeg',
            'screenshot.png',
            'animation.gif',
            'modern.webp',
            'IMAGE.JPG',  # Test case insensitivity
            'PHOTO.PNG',
            'file.JPEG'
        ]
        
        for filename in valid_files:
            with self.subTest(filename=filename):
                self.assertTrue(allowed_file(filename))

    def test_allowed_file_invalid_extensions(self):
        """Test allowed_file function with invalid extensions"""
        invalid_files = [
            'document.pdf',
            'archive.zip',
            'script.js',
            'style.css',
            'data.json',
            'executable.exe',
            'virus.bat',
            'malware.scr',
            'document.doc',
            'spreadsheet.xls',
            'presentation.ppt',
            'text.txt',
            'code.py',
            'markup.html'
        ]
        
        for filename in invalid_files:
            with self.subTest(filename=filename):
                self.assertFalse(allowed_file(filename))

    def test_allowed_file_no_extension(self):
        """Test allowed_file function with files having no extension"""
        files_without_extension = [
            'filename',
            'image',
            'photo',
            'README',
            'Dockerfile'
        ]
        
        for filename in files_without_extension:
            with self.subTest(filename=filename):
                self.assertFalse(allowed_file(filename))

    def test_allowed_file_multiple_dots(self):
        """Test allowed_file function with filenames containing multiple dots"""
        files_with_multiple_dots = [
            'image.backup.jpg',
            'photo.old.png',
            'screenshot.2021.gif',
            'file.name.webp',
            'document.backup.pdf',  # Invalid
            'script.min.js'         # Invalid
        ]
        
        expected_results = [True, True, True, True, False, False]
        
        for filename, expected in zip(files_with_multiple_dots, expected_results):
            with self.subTest(filename=filename):
                self.assertEqual(allowed_file(filename), expected)

    def test_allowed_file_empty_filename(self):
        """Test allowed_file function with empty filename"""
        self.assertFalse(allowed_file(''))
        self.assertFalse(allowed_file('.jpg'))  # Just extension
        self.assertFalse(allowed_file('.'))     # Just dot

    def test_allowed_file_edge_cases(self):
        """Test allowed_file function with edge cases"""
        edge_cases = [
            ('file.jpg.txt', False),    # Ends with invalid extension
            ('file.txt.jpg', True),     # Ends with valid extension
            ('file..jpg', True),        # Double dot before extension
            ('file.JPG.', False),       # Trailing dot
            ('.hidden.jpg', False),     # Hidden file - should be rejected
            ('very_long_filename_that_might_cause_issues.png', True),
            ('file with spaces.jpg', True),
            ('file-with-dashes.png', True),
            ('file_with_underscores.gif', True),
            ('file123.webp', True),
            ('123file.jpg', True)
        ]
        
        for filename, expected in edge_cases:
            with self.subTest(filename=filename):
                self.assertEqual(allowed_file(filename), expected)

    def test_validate_bug_report_data_valid_data(self):
        """Test validate_bug_report_data function with valid data"""
        valid_data = {
            'title': 'Bug in login form',
            'description': 'The login form does not validate email properly'
        }
        
        errors = validate_bug_report_data(valid_data)
        self.assertEqual(errors, [])

    def test_validate_bug_report_data_missing_title(self):
        """Test validate_bug_report_data function with missing title"""
        data_without_title = {
            'description': 'The login form does not validate email properly'
        }
        
        errors = validate_bug_report_data(data_without_title)
        self.assertIn('Title is required', errors)

    def test_validate_bug_report_data_empty_title(self):
        """Test validate_bug_report_data function with empty title"""
        data_with_empty_title = {
            'title': '',
            'description': 'The login form does not validate email properly'
        }
        
        errors = validate_bug_report_data(data_with_empty_title)
        self.assertIn('Title is required', errors)

    def test_validate_bug_report_data_whitespace_only_title(self):
        """Test validate_bug_report_data function with whitespace-only title"""
        data_with_whitespace_title = {
            'title': '   \t\n  ',
            'description': 'The login form does not validate email properly'
        }
        
        errors = validate_bug_report_data(data_with_whitespace_title)
        self.assertIn('Title is required', errors)

    def test_validate_bug_report_data_missing_description(self):
        """Test validate_bug_report_data function with missing description"""
        data_without_description = {
            'title': 'Bug in login form'
        }
        
        errors = validate_bug_report_data(data_without_description)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_empty_description(self):
        """Test validate_bug_report_data function with empty description"""
        data_with_empty_description = {
            'title': 'Bug in login form',
            'description': ''
        }
        
        errors = validate_bug_report_data(data_with_empty_description)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_whitespace_only_description(self):
        """Test validate_bug_report_data function with whitespace-only description"""
        data_with_whitespace_description = {
            'title': 'Bug in login form',
            'description': '   \t\n  '
        }
        
        errors = validate_bug_report_data(data_with_whitespace_description)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_both_missing(self):
        """Test validate_bug_report_data function with both title and description missing"""
        empty_data = {}
        
        errors = validate_bug_report_data(empty_data)
        self.assertIn('Title is required', errors)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_both_empty(self):
        """Test validate_bug_report_data function with both title and description empty"""
        empty_data = {
            'title': '',
            'description': ''
        }
        
        errors = validate_bug_report_data(empty_data)
        self.assertIn('Title is required', errors)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_very_long_title(self):
        """Test validate_bug_report_data function with very long title"""
        long_title = 'x' * 1000  # Very long title
        data_with_long_title = {
            'title': long_title,
            'description': 'Valid description'
        }
        
        errors = validate_bug_report_data(data_with_long_title)
        # Assuming there's a length limit (this might need to be implemented)
        # For now, test that it doesn't crash with long input
        self.assertIn('Title must be less than 200 characters', errors)

    def test_validate_bug_report_data_very_long_description(self):
        """Test validate_bug_report_data function with very long description"""
        long_description = 'x' * 10000  # Very long description
        data_with_long_description = {
            'title': 'Valid title',
            'description': long_description
        }
        
        errors = validate_bug_report_data(data_with_long_description)
        # Assuming there's a length limit (this might need to be implemented)
        # For now, test that it doesn't crash with long input
        self.assertIn('Description must be less than 5000 characters', errors)

    def test_validate_bug_report_data_special_characters(self):
        """Test validate_bug_report_data function with special characters"""
        data_with_special_chars = {
            'title': 'Bug with émojis 🐛 and spëcial chars: <>&"\'',
            'description': 'Description with newlines\nand tabs\t and other chars: àáâãäåæçèéêë'
        }
        
        errors = validate_bug_report_data(data_with_special_chars)
        self.assertEqual(errors, [])

    def test_validate_bug_report_data_unicode_characters(self):
        """Test validate_bug_report_data function with Unicode characters"""
        data_with_unicode = {
            'title': '버그 리포트: ログインエラー',  # Korean and Japanese
            'description': 'Описание ошибки на русском языке'  # Russian
        }
        
        errors = validate_bug_report_data(data_with_unicode)
        self.assertEqual(errors, [])

    def test_validate_bug_report_data_sql_injection_attempt(self):
        """Test validate_bug_report_data function with SQL injection patterns"""
        malicious_data = {
            'title': "'; DROP TABLE users; --",
            'description': "1' OR '1'='1"
        }
        
        errors = validate_bug_report_data(malicious_data)
        # Should still validate as non-empty strings
        self.assertEqual(errors, [])

    def test_validate_bug_report_data_html_content(self):
        """Test validate_bug_report_data function with HTML content"""
        data_with_html = {
            'title': '<script>alert("xss")</script>Bug Title',
            'description': '<b>Bold</b> description with <a href="evil.com">link</a>'
        }
        
        errors = validate_bug_report_data(data_with_html)
        # Should validate as non-empty strings (sanitization happens elsewhere)
        self.assertEqual(errors, [])

    def test_validate_bug_report_data_none_values(self):
        """Test validate_bug_report_data function with None values"""
        data_with_none = {
            'title': None,
            'description': None
        }
        
        errors = validate_bug_report_data(data_with_none)
        self.assertIn('Title is required', errors)
        self.assertIn('Description is required', errors)

    def test_validate_bug_report_data_numeric_values(self):
        """Test validate_bug_report_data function with numeric values"""
        data_with_numbers = {
            'title': 123,
            'description': 456.789
        }
        
        errors = validate_bug_report_data(data_with_numbers)
        # Should handle non-string types gracefully by converting them to strings
        self.assertEqual(errors, [])

if __name__ == '__main__':
    unittest.main()
