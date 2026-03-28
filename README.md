# 🛒 Nectar - Grocery Delivery App (Server)

A robust, scalable, and fully type-safe backend API powering the Nectar mobile application, built with **NestJS** and **Prisma**.

## 🚀 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: Passport.js (JWT Access/Refresh strategy)
- **Documentation**: Swagger (OpenAPI)
- **Email Service**: Nodemailer (via SMTP)

## 📦 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file at the root of the server directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/nectar?schema=public"
   PORT=3000

   # JWT Secrets
   JWT_SECRET="your_access_token_secret"
   JWT_REFRESH_SECRET="your_refresh_token_secret"

   # SMTP Configuration (For forgot password emails)
   SMTP_HOST="smtp.gmail.com"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   ```

3. **Database Migration**
   Initialize the database schema:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Start the Development Server**
   ```bash
   npm run start:dev
   ```
   The API will automatically bind to `0.0.0.0` allowing local mobile devices/emulators to access it.

## 📖 API Documentation (Swagger)

A fully interactive Swagger OpenAPI dashboard is automatically generated to test requests.
With the server running, visit:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

## 🔐 Core Architecture

### Auth Controller (`/api/auth`)
Handles secure registration, email/password validation, and credential rotation.
- **Tokens**: Issues short-lived Access Tokens (e.g., 15m) and long-lived Refresh Tokens (e.g., 7d).
- **Security**: The backend cryptographically hashes passwords utilizing Argon2/Bcrypt and securely stores user sessions.

### Route Prefixes
All endpoints are globally prefixed with `/api` to ensure clean networking layers when passing through reverse proxies (like Nginx) in production.

## 📂 Folder Structure
```text
nectar-server/
├── prisma/            # Schema definitions and database migrations
├── src/
│   ├── auth/          # Authentication module & JWT strategies
│   ├── users/         # User management & profile logic
│   ├── location/      # Zone/Area configuration
│   └── main.ts        # Bootstrap & Swagger configuration
└── test/              # E2E testing framework
```
