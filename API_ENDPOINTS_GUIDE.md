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
| `PATCH` | `/:id` | Update user profile | Admin |
| `DELETE` | `/:id` | Hard delete a user | Admin |
| `PATCH` | `/assign-admin/:id` | Promote a user to Admin | Admin |
| `PATCH` | `/suspend/:id` | Suspend a user for a specific time | Admin |
| `POST` | `/register` | Register a new user (Accepts `locationCoords`) | Public |
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
| `POST` | `/` | Post a new task (Accepts `locationCoords`) | Customer |
| `PATCH` | `/:taskId` | Update task details | Customer (Owner) / Admin |
| `DELETE` | `/:taskId` | Delete a task | Customer (Owner) / Admin |

---

## 4. Offer Module (`/api/offers`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Submit an initial offer for a task (Calculates `estimatedTime`) | Worker |
| `PATCH` | `/:offerId/accept` | Accept an offer (assigns worker & closes task) | Customer (Owner) |
| `PATCH` | `/:offerId/counter` | Propose a new price (Counter-bid) | Customer (Owner) |
| `PATCH` | `/:offerId/respond` | Respond to a customer's counter-bid | Worker (Offer Owner) |

---

## 5. Message Module (`/api/messages`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Send a message to another user | Authenticated |
| `GET` | `/:otherUserId` | Get chat history between current user and another user | Authenticated |

---

## 6. Real-Time Sockets (Socket.io)

The backend supports real-time communication via Socket.io.

| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `connection` | Client -> Server | Connect to the WebSocket. Requires `token` in auth payload or headers. |
| `newMessage` | Server -> Client | Fired when a new message is received in an active chat. |
| `trackingStarted` | Server -> Client | Fired when an offer is accepted to signal start of live tracking. |
| `updateLocation` | Client -> Server | Worker emits `{ lat, lng, taskId, customerId }` to update location. |
| `locationUpdated` | Server -> Client | Server broadcasts worker's live location to the customer's map. |
| `disconnect` | Client -> Server | Disconnect from the WebSocket. |

---

## 7. Authentication Header
All routes marked as **Admin**, **Owner**, **Authenticated**, **Customer**, or **Worker** require the following header:
`Authorization: bearer <your_jwt_token>`
