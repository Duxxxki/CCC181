# CCC181
JH Studios Workflow Management System
A web-based workflow management system for JH Studios. It currently provides secure employee login, a personal workspace dashboard, and admin-only employee account creation.
Features
Login with JWT. Credentials are checked against PostgreSQL, and a signed JWT is stored in an `httpOnly` cookie.
Workspace dashboard. Shows the signed-in user's name and system role.
Admin-only account creation. Admins can create employee accounts from the dashboard. The restriction is enforced on the server, not just hidden in the UI.
Password security. Passwords are hashed with bcrypt (12 rounds) and must be at least 12 characters.
Session handling. The current user is re-checked against the database on every request, so deactivated accounts lose access immediately.
Logout. Clears the authentication cookie.
Tech Stack
Backend: Node.js, Express
Database: PostgreSQL (`pg`)
Auth: `jsonwebtoken`, `bcrypt`, `cookie-parser`
Frontend: HTML, CSS, vanilla JavaScript
Project Structure
```
project/
├── backend/
│   ├── app.js            # Express setup and routes
│   ├── server.js         # Loads .env and starts the server
│   ├── db.js             # PostgreSQL connection pool
│   ├── seedAdmin.js      # Optional: creates the initial admin account
│   ├── .env              # Your local secrets (not committed)
│   └── .env.example      # Template for .env
└── frontend/
    ├── login.html
    ├── dashboard.html
    ├── css/
    │   └── style.css
    └── js/
        ├── login.js
        └── dashboard.js
```
Getting Started
Prerequisites
Node.js 18 or later
PostgreSQL 13 or later
1. Install dependencies
```bash
cd backend
npm install
```
This installs everything listed in `package.json`. If you are setting the project up from scratch (no `package.json` yet), run:
```bash
cd backend
npm init -y
npm install express pg bcrypt jsonwebtoken cookie-parser dotenv
```
Package	Purpose
`express`	Web server, routing and static file serving
`pg`	PostgreSQL client and connection pool
`bcrypt`	Password hashing and verification
`jsonwebtoken`	Signing and verifying JWTs
`cookie-parser`	Reads the auth cookie from requests (`req.cookies`)
`dotenv`	Loads variables from `.env`
Optional, for development only:
```bash
npm install --save-dev nodemon
```
Then you can run `npx nodemon server.js` to restart the server automatically when files change.
2. Create the database
```bash
createdb jh_studios_workflow
```
Create a `users` table with at least these columns:
Column	Notes
`id`	Primary key
`full_name`	Up to 150 characters
`email`	Unique, up to 255 characters, stored lowercase
`password_hash`	bcrypt hash
`role`	Defaults to the employee role. Admins must be stored as exactly `admin`.
`status`	Defaults to `active`. Only `active` accounts can log in.
`created_at`	Defaults to the current timestamp
3. Configure environment variables
Copy the template and fill in your values:
```bash
cp .env.example .env
```
Variable	Description
`PORT`	Port the server listens on (default `3000`)
`DB_HOST`	PostgreSQL host
`DB_PORT`	PostgreSQL port (default `5432`)
`DB_NAME`	Database name (default `jh_studios_workflow`)
`DB_USER`	PostgreSQL username
`DB_PASSWORD`	PostgreSQL password
`JWT_SECRET`	Long random string used to sign tokens. The server will not start without it.
`INITIAL_ADMIN_NAME`	Full name for the first admin
`INITIAL_ADMIN_EMAIL`	Email for the first admin
`INITIAL_ADMIN_PASSWORD`	Password for the first admin (at least 12 characters)
Generate a strong secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
4. Create the first admin
```bash
node seedAdmin.js
```
The script reads the `INITIAL_ADMIN_*` values from `.env`. It is safe to run more than once and skips an email that already exists.
5. Start the server
```bash
node server.js
```
Open http://localhost:3000/login and sign in with the admin credentials.
Usage
Log in at `/login`.
You are redirected to `/dashboard`.
If you are an admin, the Create Employee Account panel appears. Enter a full name, work email and temporary password to add an employee.
New employees can log in with the credentials you set.
API Reference
Method	Endpoint	Access	Description
`GET`	`/`	Public	API health check
`POST`	`/api/auth/login`	Public	Validates credentials and sets the auth cookie
`GET`	`/api/auth/me`	Authenticated	Returns the current user
`POST`	`/api/auth/logout`	Public	Clears the auth cookie
`POST`	`/api/users`	Admin only	Creates an employee account
`GET`	`/login`	Public	Login page
`GET`	`/dashboard`	Public page, data requires login	Dashboard page
Example: create an account (admin session required)
```http
POST /api/users
Content-Type: application/json

{
  "fullName": "Jane Doe",
  "email": "jane@jhstudios.com",
  "password": "a-long-password-123"
}
```
Responses: `201` created, `400` validation error, `401` not logged in, `403` not an admin, `409` email already exists.
Security Notes
Never commit `.env`. Make sure it is listed in `.gitignore`.
Use a strong, unique `JWT_SECRET` in every environment.
In production, set `NODE_ENV=production` so the auth cookie is sent only over HTTPS, and serve the app behind HTTPS.
Tokens expire after 1 hour.
The dashboard HTML is publicly reachable, but all user data comes from authenticated API calls.
Current Limitations
The User Management link scrolls to the account-creation form. A full user list, role changes and account deactivation are not built yet.
The Tasks panel is a placeholder.
There is no password reset flow. Users must contact an administrator.
There are no automated tests yet.
Roadmap
User management page (list, deactivate, change role)
Task assignment and tracking
Password reset by an administrator
Move authentication checks into reusable middleware and split routes into separate files
License
Add a license of your choice before publishing, for example MIT.
