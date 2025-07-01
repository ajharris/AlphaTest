from flask import Flask, send_from_directory, redirect, request, session, jsonify
import os
import requests
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
import time
from datetime import datetime
import tempfile

app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret')

# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'your_client_id')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'your_client_secret')

# IMPORTANT: Make sure this value exactly matches what is configured in your GitHub OAuth App
# If running locally, 127.0.0.1 is safer than localhost
GITHUB_REDIRECT_URI = os.environ.get(
    'GITHUB_REDIRECT_URI',
    'http://127.0.0.1:5000/github/callback'
)

GITHUB_OAUTH_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
GITHUB_OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token'

# Configure file uploads
UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'bug_reports')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Rate limiting storage (in production, use Redis or database)
submission_history = {}

# Serve React frontend
@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

# GitHub login
@app.route("/login/github")
def login_github():
    auth_url = f"{GITHUB_OAUTH_AUTHORIZE_URL}?client_id={GITHUB_CLIENT_ID}&redirect_uri={GITHUB_REDIRECT_URI}&scope=repo"
    print("DEBUG redirect_uri sent to GitHub:", GITHUB_REDIRECT_URI)
    return redirect(auth_url)


# GitHub OAuth callback
@app.route("/github/callback")
def github_callback():
    code = request.args.get('code')
    if not code:
        return redirect('/?error=missing_code')

    token_resp = requests.post(
        GITHUB_OAUTH_TOKEN_URL,
        headers={'Accept': 'application/json'},
        data={
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': GITHUB_REDIRECT_URI  # optional but recommended to match
        }
    )

    token_json = token_resp.json()
    access_token = token_json.get('access_token')

    if not access_token:
        return redirect('/?error=token_exchange_failed')

    session['github_token'] = access_token
    return redirect('/dashboard')

# Protected route
@app.route("/dashboard")
def dashboard():
    if 'github_token' not in session:
        return redirect('/login/github')
    return send_from_directory(app.static_folder, "index.html")

@app.route("/me")
def get_user_info():
    token = session.get('github_token')
    if not token:
        return redirect('/login/github')

    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {token}"}
    )

    if user_resp.status_code != 200:
        return redirect('/?error=failed_to_fetch_user')

    return user_resp.json()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_rate_limited(client_ip):
    """Simple rate limiting: max 5 submissions per hour per IP"""
    current_time = time.time()
    hour_ago = current_time - 3600
    
    if client_ip not in submission_history:
        submission_history[client_ip] = []
    
    # Remove old submissions
    submission_history[client_ip] = [
        timestamp for timestamp in submission_history[client_ip] 
        if timestamp > hour_ago
    ]
    
    return len(submission_history[client_ip]) >= 5

def validate_bug_report_data(data):
    """Validate bug report submission data"""
    errors = []
    
    if not data.get('title', '').strip():
        errors.append('Title is required')
    
    if not data.get('description', '').strip():
        errors.append('Description is required')
    
    if len(data.get('title', '')) > 200:
        errors.append('Title must be less than 200 characters')
    
    if len(data.get('description', '')) > 5000:
        errors.append('Description must be less than 5000 characters')
    
    return errors

@app.route('/api/bug-report', methods=['POST'])
def submit_bug_report():
    """Handle bug report submission with file upload"""
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    
    # Check rate limiting
    if is_rate_limited(client_ip):
        return jsonify({
            'error': 'Rate limit exceeded. Maximum 5 submissions per hour.'
        }), 429
    
    # Get form data
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    device_info = request.form.get('deviceInfo', '')
    
    # Validate required fields
    validation_errors = validate_bug_report_data({
        'title': title,
        'description': description
    })
    
    if validation_errors:
        return jsonify({
            'error': 'Validation failed',
            'details': validation_errors
        }), 400
    
    # Handle file upload
    screenshot_path = None
    if 'screenshot' in request.files:
        file = request.files['screenshot']
        if file and file.filename != '':
            # Validate file
            if not allowed_file(file.filename):
                return jsonify({
                    'error': 'Invalid file type. Only image files are allowed.'
                }), 400
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                return jsonify({
                    'error': 'File size too large. Maximum size is 5MB.'
                }), 400
            
            # Save file
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            screenshot_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(screenshot_path)
    
    # Process bug report data
    bug_report = {
        'id': f"bug_{int(time.time())}_{hash(client_ip) % 10000}",
        'title': title,
        'description': description,
        'device_info': device_info,
        'screenshot_path': screenshot_path,
        'client_ip': client_ip,
        'submitted_at': datetime.now().isoformat(),
        'status': 'pending'
    }
    
    # In a real application, you would:
    # 1. Save to database
    # 2. Send email notification
    # 3. Create GitHub issue
    # 4. Upload file to cloud storage
    
    # For now, just log the submission
    print(f"Bug report submitted: {bug_report}")
    
    # Record submission for rate limiting
    if client_ip not in submission_history:
        submission_history[client_ip] = []
    submission_history[client_ip].append(time.time())
    
    return jsonify({
        'success': True,
        'bug_report_id': bug_report['id'],
        'message': 'Bug report submitted successfully'
    }), 201

@app.route('/api/bug-reports', methods=['GET'])
def get_bug_reports():
    """Get list of bug reports (for admin/debugging)"""
    # This would normally query a database
    # For demo purposes, return empty list
    return jsonify({
        'bug_reports': [],
        'total': 0
    })

# Error handlers
@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 Method Not Allowed errors"""
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found errors for API routes"""
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    # For non-API routes, serve the React app
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)