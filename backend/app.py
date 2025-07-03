from flask import Flask, send_from_directory, redirect, request, session, jsonify
import os
import requests
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
import time
from datetime import datetime
import tempfile
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import DateTime, func

app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///alphatest.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    github_id = db.Column(db.Integer, unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    access_token = db.Column(db.String(255), nullable=True)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    repositories = db.relationship('Repository', backref='user', lazy=True)
    bug_reports = db.relationship('BugReport', backref='user', lazy=True)

class Repository(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    github_id = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    html_url = db.Column(db.String(255), nullable=False)
    clone_url = db.Column(db.String(255), nullable=True)
    language = db.Column(db.String(50), nullable=True)
    is_private = db.Column(db.Boolean, default=False)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    bug_reports = db.relationship('BugReport', backref='repository', lazy=True)

class BugReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    device_info = db.Column(db.Text, nullable=True)
    screenshot_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='open')  # open, closed, in_progress
    priority = db.Column(db.String(10), default='medium')  # low, medium, high, critical
    client_ip = db.Column(db.String(45), nullable=True)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repository.id'), nullable=True)

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
    normalized_path = os.path.normpath(path)
    full_path = os.path.realpath(os.path.join(app.static_folder, normalized_path))
    if not full_path.startswith(os.path.realpath(app.static_folder)):
        return jsonify({"error": "Invalid path"}), 404
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, os.path.relpath(full_path, app.static_folder))
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

@app.route("/api/user")
def get_current_user():
    """Get current authenticated user information"""
    token = session.get('github_token')
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {token}"}
    )

    if user_resp.status_code != 200:
        return jsonify({"error": "Failed to fetch user data"}), 401

    user_data = user_resp.json()
    
    # Store or update user in database
    user = User.query.filter_by(github_id=user_data['id']).first()
    if not user:
        user = User(
            github_id=user_data['id'],
            username=user_data['login'],
            email=user_data.get('email'),
            avatar_url=user_data.get('avatar_url'),
            access_token=token
        )
        db.session.add(user)
    else:
        user.username = user_data['login']
        user.email = user_data.get('email')
        user.avatar_url = user_data.get('avatar_url')
        user.access_token = token
    
    db.session.commit()

    return jsonify({
        "user": user_data,
        "access_token": token
    })

@app.route("/api/repositories")
def get_user_repositories():
    """Fetch and store user repositories from GitHub"""
    token = session.get('github_token')
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    # Get current user
    user = User.query.filter_by(access_token=token).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        # Fetch repositories from GitHub API
        repos_resp = requests.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={"Authorization": f"token {token}"}
        )

        if repos_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch repositories"}), 500

        repos_data = repos_resp.json()
        
        # Store repositories in database
        for repo_data in repos_data:
            repo = Repository.query.filter_by(github_id=repo_data['id']).first()
            if not repo:
                repo = Repository(
                    github_id=repo_data['id'],
                    name=repo_data['name'],
                    full_name=repo_data['full_name'],
                    description=repo_data.get('description'),
                    html_url=repo_data['html_url'],
                    clone_url=repo_data.get('clone_url'),
                    language=repo_data.get('language'),
                    is_private=repo_data['private'],
                    user_id=user.id
                )
                db.session.add(repo)
            else:
                # Update existing repository
                repo.name = repo_data['name']
                repo.full_name = repo_data['full_name']
                repo.description = repo_data.get('description')
                repo.html_url = repo_data['html_url']
                repo.clone_url = repo_data.get('clone_url')
                repo.language = repo_data.get('language')
                repo.is_private = repo_data['private']
        
        db.session.commit()

        return jsonify({
            "repositories": repos_data,
            "count": len(repos_data)
        })

    except Exception as e:
        return jsonify({"error": f"Failed to process repositories: {str(e)}"}), 500

def allowed_file(filename):
    if not filename or not filename.strip():
        return False
    # Prevent files that start with a dot (hidden files)
    if filename.startswith('.'):
        return False
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
    
    # Ensure title is a string and not empty
    title = data.get('title', '')
    if not isinstance(title, str):
        title = str(title) if title is not None else ''
    if not title.strip():
        errors.append('Title is required')
    elif len(title) > 200:
        errors.append('Title must be less than 200 characters')
    
    # Ensure description is a string and not empty
    description = data.get('description', '')
    if not isinstance(description, str):
        description = str(description) if description is not None else ''
    if not description.strip():
        errors.append('Description is required')
    elif len(description) > 5000:
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
    repository_id = request.form.get('repository_id')
    
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

    # Get current user (optional)
    user = None
    token = session.get('github_token')
    if token:
        user = User.query.filter_by(access_token=token).first()
    
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
            timestamp = int(time.time())
            unique_filename = f"{timestamp}_{filename}"
            screenshot_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(screenshot_path)

    # Create bug report in database
    try:
        bug_report = BugReport(
            title=title,
            description=description,
            device_info=device_info,
            screenshot_path=screenshot_path,
            client_ip=client_ip,
            user_id=user.id if user else None,
            repository_id=int(repository_id) if repository_id and repository_id.isdigit() else None
        )
        
        db.session.add(bug_report)
        db.session.commit()
        
        # Update rate limiting
        if client_ip not in submission_history:
            submission_history[client_ip] = []
        submission_history[client_ip].append(time.time())
        
        return jsonify({
            'success': True,
            'message': 'Bug report submitted successfully',
            'bug_report_id': bug_report.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': f'Failed to save bug report: {str(e)}'
        }), 500

@app.route('/api/bug-reports', methods=['GET'])
def get_bug_reports():
    """Get list of bug reports from database"""
    try:
        # Get optional filters
        user_id = request.args.get('user_id')
        repository_id = request.args.get('repository_id')
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 10)), 100)
        
        # Build query
        query = BugReport.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        if repository_id:
            query = query.filter_by(repository_id=repository_id)
        if status:
            query = query.filter_by(status=status)
        
        # Order by created_at desc
        query = query.order_by(BugReport.created_at.desc())
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        bug_reports = []
        for report in paginated.items:
            bug_reports.append({
                'id': report.id,
                'title': report.title,
                'description': report.description,
                'status': report.status,
                'priority': report.priority,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'user': report.user.username if report.user else None,
                'repository': report.repository.full_name if report.repository else None,
                'has_screenshot': bool(report.screenshot_path)
            })
        
        return jsonify({
            'bug_reports': bug_reports,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch bug reports: {str(e)}'}), 500

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
    # Create database tables
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
    
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)