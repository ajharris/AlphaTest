from flask import Flask, send_from_directory, redirect, request, session, url_for
import os
import requests
from flask_cors import CORS

app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret')

GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'your_client_id')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'your_client_secret')
GITHUB_OAUTH_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
GITHUB_OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token'

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

@app.route("/login/github")
def login_github():
    redirect_uri = url_for('github_callback', _external=True)
    return redirect(f"{GITHUB_OAUTH_AUTHORIZE_URL}?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope=repo")

@app.route("/github/callback")
def github_callback():
    code = request.args.get('code')
    if not code:
        return redirect('/?error=missing_code')
    # Exchange code for token
    token_resp = requests.post(
        GITHUB_OAUTH_TOKEN_URL,
        headers={'Accept': 'application/json'},
        data={
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code
        }
    )
    token_json = token_resp.json()
    access_token = token_json.get('access_token')
    if not access_token:
        return redirect('/?error=token_exchange_failed')
    session['github_token'] = access_token
    return redirect('/dashboard')

@app.route("/dashboard")
def dashboard():
    if 'github_token' not in session:
        return redirect('/login/github')
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
