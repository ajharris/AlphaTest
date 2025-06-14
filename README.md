# AlphaTest

**AlphaTest** is a web-based platform designed to streamline the alpha testing process for web apps. It provides an integrated environment where testers can interact with applications in a browser pane, submit UX feedback, and view/report GitHub issues in real-time.

---

## 🚀 Features

- 🔐 GitHub OAuth login for testers and developers
- 🧭 Repository selector for multi-project testing
- 🖼️ Embedded iframe viewer to test any web app
- 📝 Report bugs directly from the interface
- 📋 View and comment on existing GitHub issues
- 🏷️ Automatic label tagging for reported issues

---

## 🔧 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajharris/AlphaTest.git
   cd AlphaTest
   ```

2. **Install dependencies**
   *(Assumes you’re using Python + Flask and Node + React — adjust to your tech stack)*
   ```bash
   cd backend
   pip install -r requirements.txt

   cd ../frontend
   npm install
   ```

3. **Create a GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Register a new app with callback URL: `http://localhost:5000/callback`
   - Save your `client_id` and `client_secret`

4. **Set environment variables**
   Create a `.env` file in the backend folder:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

5. **Run the app**
   ```bash
   # Backend
   cd backend
   flask run

   # Frontend
   cd ../frontend
   npm start
   ```

---

## 👨‍💻 For Testers

1. Log in with GitHub
2. Select the repository you are testing
3. Use the embedded app viewer
4. Report any issues using the panel on the right
5. View or comment on others’ reports

---

## 🐛 Reporting Issues

If you find a problem with **AlphaTest itself**, feel free to [open an issue](https://github.com/ajharris/AlphaTest/issues) in this repository.

For feedback on *apps under test*, please use the in-app issue submission panel during your testing session.

---

## 📄 License

MIT License  
© 2025 Andrew Harris
