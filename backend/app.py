from flask import Flask, send_from_directory, redirect, request, session
import os
import requests
from flask_cors import CORS

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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)