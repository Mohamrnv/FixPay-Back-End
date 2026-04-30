# 💳 FixPay Back-End 🚀

The core API for the FixPay platform, providing secure authentication, marketplace logic, real-time communication, and AI-driven identity verification.

---

## 🌟 Key Features

### 🔐 Authentication & Security
- **JWT & Role-Based Access**: Secure access for `User`, `Worker`, and `Admin`.
- **Permanent Banning**: Advanced moderation that prevents re-registration by matching ID/SSN/Email data.
- **Data Encryption**: Deterministic AES-256-CBC encryption for sensitive PII.

### 👤 User & Identity
- **AI-Powered Identity Verification**: Integration with a Python/Flask service for face matching and liveness detection.
- **Admin Dashboard Integration**: Specialized endpoints for audit, suspension, and reporting.
- **Profile Management**: Multi-platform profile handling via Cloudinary.

### 🚩 Marketplace & Moderation
- **Task & Offer Engine**: Full lifecycle management of job requests and worker bids.
- **Reporting System**: Dedicated module for users to report inappropriate behavior or fraud.
- **Real-Time Communication**: Socket.io integration for instant messaging and location tracking.

---

## ⚙️ Setup & Installation

### 1. Environment Variables
Create a `.env` file with the following keys:
```env
PORT=2001
MONGODB_URI=your_mongodb_uri
JWT_KEY=your_secret_key

# AI Verification Service
PYTHON_API_URL=http://localhost:5000

# Cloudinary
CLOUD_NAME=...
CLOUD_KEY=...
CLOUD_SECRET=...

# Email
USER_EMAIL=...
USER_PASSWORD=...
```

### 2. Run with Docker (Recommended)
```bash
docker-compose up backend
```

### 3. Manual Start
```bash
npm install
npm run dev
```

---

## 🛣️ API Modules

### 👥 User (`/api/user`)
- `POST /verify-identity`: Multi-part upload for AI verification.
- `PATCH /suspend/:id`: Temporarily suspend or **permanently ban** a user.
- `PATCH /review-identity/:id`: Admin manual approval of verification results.

### 🚩 Reports (`/api/reports`)
- `POST /`: Submit a report.
- `GET /`: (Admin) View all community reports.
- `PATCH /:id/status`: (Admin) Resolve or dismiss a report.

### 🛠️ Other Modules
- `/api/tasks`: Marketplace operations.
- `/api/offers`: Worker bidding logic.
- `/api/categories`: Service categorization.
- `/api/messages`: Real-time chat history.

---

Developed by **Mohamed Hussein Tammaa**
