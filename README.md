# 💳 FixPay Back-End 🚀

Welcome to the **FixPay Back-End**, a robust and secure RESTful API built with **Node.js**, **Express**, and **MongoDB**. This project provides the backbone for a payment and service-based platform, featuring advanced authentication, identity verification, and role-based access control.

---

## 🌟 Key Features

### 🔐 Authentication & Security
- **Secure Registration & Login**: Multi-layer security with password hashing (Bcrypt).
- **Google OAuth**: Integrated Google Login for seamless user experience.
- **JWT Authentication**: Token-based security for all protected routes.
- **OTP Verification**: Email-based OTP for account confirmation and password resets.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `User`, `Worker`, and `Admin`.

### 👤 User Management
- **Profile Customization**: Update user details and upload profile images via Cloudinary.
- **AI-Powered Identity Verification**: Advanced identity verification using a dedicated Python service (YOLOv8) for ID detection and live face matching.
- **Admin Dashboard**: Comprehensive tools for managing users, assigning admins, and account deletion.

### 📂 Category & Worker Services
- **Category Management**: Organize services into categories (Admin only).
- **Worker Discovery**: Filter and find workers based on specific categories.

### 📧 Communication & Storage
- **Automated Emails**: Integrated Nodemailer for OTPs and notifications.
- **Cloud Media Storage**: High-performance image uploads and storage using Cloudinary.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT & Passport (Google OAuth)
- **File Handling**: Multer & Cloudinary
- **Validation**: Express-Validator
- **Communication**: Nodemailer

---

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js (v18+ recommended)
- MongoDB account (Atlas or Local)
- Cloudinary account (for image uploads)
- Google Cloud Console project (for Google Auth)

### ⚙️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MohamedHusseinTammaa/FixPay-Back-End-.git
   cd FixPay-Back-End-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   
   # Cloudinary Config
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Email Config
   EMAIL_USER=your_email
   EMAIL_PASS=your_app_password
   
   # Google Auth
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Run the server:**
   ```bash
   npm run test  # This uses nodemon to start 'src/index.js'
   ```

---

## 🛣️ API Endpoints Summary

### 👤 User Routes (`/api/user`)
- `POST /register` - Create a new account.
- `POST /login` - Sign in to your account.
- `POST /google-login` - Authentication via Google.
- `POST /confirmEmail` - Confirm account via OTP.
- `PATCH /assign-admin/:id` - (Admin) Promote a user to Admin.
- `POST /verify-identity` - Upload ID and live image for verification.

### 📁 Category Routes (`/api/categories`)
- `GET /` - List all categories.
- `GET /:id` - Get category details.
- `GET /:id/workers` - Get all workers in a specific category.
- `POST /` - (Admin) Create a new category.

### 📋 Task Routes (`/api/tasks`)
- `GET /open` - List all available (open) tasks with pagination.
- `GET /:taskId/offers` - (Customer) View all offers submitted for a specific task.
- `POST /` - Create a new service task (job request). Supports up to 5 image uploads.

### 🏷️ Offer Routes (`/api/offers`)
- `POST /` - (Worker) Submit a bid/offer for an open task.

---

## 📁 Project Structure

```text
src/
├── DB/             # Database connection & schemas
├── Middlewares/    # Custom middlewares (auth, validation)
├── Models/         # Mongoose models
├── Modules/        # Feature-based logic (Category, User)
├── Routes/         # API Route definitions
├── Utils/          # Helpers, enums, and constants
└── index.js        # Main entry point
```

---

## 📄 License
This project is licensed under the **ISC License**.

---
*Developed with ❤️ by the FixPay Team.*
