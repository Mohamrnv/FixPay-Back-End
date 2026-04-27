# FixPay API - Full Endpoint Reference

This document lists all available API endpoints in the FixPay backend.

## Base URL
`http://localhost:2001/api` (or your configured port)

---

## 1. User Module (`/api/user`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all users | Admin |
| `GET` | `/:id` | Get user details by ID | Admin / Owner |
| `PATCH` | `/:id` | Update user profile | Admin / Owner |
| `DELETE` | `/:id` | Hard delete a user | Admin / Owner |
| `PATCH` | `/assign-admin/:id` | Promote a user to Admin | Admin |
| `PATCH` | `/suspend/:id` | Suspend a user for a specific time | Admin |
| `POST` | `/register` | Register a new user | Public |
| `POST` | `/login` | Authenticate user | Public |
| `POST` | `/logout` | Invalidate current session | Authenticated |
| `POST` | `/confirmEmail` | Verify email with OTP | Authenticated |
| `POST` | `/resend-confirmation-otp` | Request a new verification OTP | Authenticated |
| `POST` | `/complete-profile` | Add SSN and Phone to Google accounts | Authenticated |
| `POST` | `/google-login` | Authenticate via Google OAuth | Public |
| `POST` | `/verify-identity` | Upload ID and live face for AI verification | Authenticated |
| `POST` | `/upload` | Upload profile avatar image | Authenticated |
| `POST` | `/forgotPassword` | Request password reset OTP | Public |
| `POST` | `/resend-resetpassword-otp` | Resend password reset OTP | Public |
| `POST` | `/resetPassword` | Reset password using OTP | Public |

---

## 2. Category Module (`/api/categories`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all available categories | Authenticated |
| `GET` | `/:id` | Get category details | Authenticated |
| `GET` | `/:id/workers` | List all workers in a specific category | Authenticated |
| `POST` | `/` | Create a new category | Admin |

---

## 3. Task Module (`/api/tasks`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/open` | List all tasks with "open" status (paginated) | Authenticated |
| `GET` | `/:taskId/offers` | View all offers submitted for a task | Customer (Owner) / Admin |
| `POST` | `/` | Post a new task | Customer |
| `PATCH` | `/:taskId` | Update task details | Customer (Owner) / Admin |
| `DELETE` | `/:taskId` | Delete a task | Customer (Owner) / Admin |

---

## 4. Offer Module (`/api/offers`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Submit an initial offer for a task | Worker |
| `PATCH` | `/:offerId/accept` | Accept an offer (assigns worker & closes task) | Customer (Owner) |
| `PATCH` | `/:offerId/counter` | Propose a new price (Counter-bid) | Customer (Owner) |
| `PATCH` | `/:offerId/respond` | Respond to a customer's counter-bid | Worker (Offer Owner) |

---

## 5. Message Module (`/api/messages`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Send a message for a specific task | Involved Users* |
| `GET` | `/:taskId/:otherUserId` | Get chat history between two users | Involved Users* |

*\*Involved Users: The task owner and any worker who has an active offer for that task.*

---

## 6. Authentication Header
All routes marked as **Admin**, **Owner**, **Authenticated**, **Customer**, or **Worker** require the following header:
`Authorization: bearer <your_jwt_token>`
