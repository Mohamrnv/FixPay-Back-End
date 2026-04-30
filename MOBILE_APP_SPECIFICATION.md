# FixPay Mobile App Specification

This document provides a comprehensive guide for developers building the FixPay mobile application (iOS & Android). It outlines the core features, user journeys, and technical integration with the backend API.

---

## 1. App Overview
FixPay is a peer-to-peer on-demand service marketplace that connects **Customers** (who need tasks done) with **Workers** (who provide services). 

### Key Roles:
1.  **Customer**: Posts tasks, reviews offers, communicates with workers, and tracks progress.
2.  **Worker**: Browses open tasks, submits offers/bids, and provides live location tracking during active service.

---

## 2. Authentication & Onboarding

### Flow:
- **Registration**: Users can register as a "User" (Customer) or "Worker". Workers must specify their category (e.g., Electrician, Plumber).
- **Identity Verification (KYC)**: Crucial for workers. Requires uploading a photo of their ID card and a live selfie for AI-based face matching.
- **Login**: Support for standard Email/Password and Google OAuth.

### Endpoints:
| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Register | `POST` | `/api/user/register` | Register new account. Include `locationCoords` for local matching. |
| Login | `POST` | `/api/user/login` | Standard login. Returns JWT. |
| Google Login | `POST` | `/api/user/google-login` | Syncs Google profile and handles authentication. |
| Identity Verification | `POST` | `/api/user/verify-identity` | Upload ID image + Selfie image. Triggers AI verification. |
| OTP Verification | `POST` | `/api/user/confirmEmail` | Verify email using OTP sent after registration. |
| Forgot Password | `POST` | `/api/user/forgotPassword` | Request password reset OTP. |

---

## 3. Service Discovery (Customer Focus)

### Features:
- **Browse Categories**: View list of available service types (e.g., Maintenance, Cleaning).
- **Find Workers**: View a list of workers in a specific category, filtered by proximity or rating.

### Endpoints:
| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Categories | `GET` | `/api/categories` | Fetch all service categories with icons. |
| Category Detail | `GET` | `/api/categories/:id` | Get details of a specific category. |
| Workers in Category| `GET` | `/api/categories/:id/workers` | Get list of workers specializing in this category. |

---

## 4. Task Management (Customer Journey)

### Flow:
1.  **Post Task**: Customer describes the problem, attaches images, and sets their location.
2.  **Manage Tasks**: Customer can view their active tasks and update them if needed.

### Endpoints:
| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Post Task | `POST` | `/api/tasks` | Create a new task. Include `images`, `description`, and `categoryId`. |
| Update Task | `PATCH` | `/api/tasks/:id` | Modify task details. |
| Delete Task | `DELETE` | `/api/tasks/:id` | Cancel an open task. |
| My Tasks | `GET` | `/api/tasks/open` | Fetch all open tasks (can be filtered by owner). |

---

## 5. Bidding & Offers (Worker Journey)

### Flow:
1.  **Browse Tasks**: Workers see tasks in their category near their location.
2.  **Submit Offer**: Worker proposes a price and estimated completion time.
3.  **Negotiate**: Customer can send a "Counter-Offer". Worker can respond to it.
4.  **Accept**: Once accepted, the task is "Locked" and tracking begins.

### Endpoints:
| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Submit Offer | `POST` | `/api/offers` | Submit initial bid. Requires `price` and `taskId`. |
| View Offers | `GET` | `/api/tasks/:taskId/offers` | Customer views all bids for their task. |
| Accept Offer | `PATCH` | `/api/offers/:id/accept` | Customer accepts a specific worker's bid. |
| Counter Offer | `PATCH` | `/api/offers/:id/counter` | Customer proposes a different price. |
| Respond to Counter| `PATCH` | `/api/offers/:id/respond` | Worker accepts or declines the customer's counter. |

---

## 6. Real-Time Communication (Socket.io)

The app must establish a WebSocket connection immediately after login for real-time features.

### Features:
- **Direct Messaging**: Chat between Customer and Worker.
- **Live Location**: The worker's location is streamed to the customer's map after an offer is accepted.

### Socket Events:
| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `connection` | Client -> Server | `{ token: 'JWT' }` | Authenticate the socket connection. |
| `sendMessage` | Client -> Server | `{ to, message }` | Send a text message. |
| `newMessage` | Server -> Client | `{ from, message, timestamp }` | Receive a message. |
| `updateLocation`| Worker -> Server | `{ lat, lng, taskId, customerId }` | Worker streams GPS coords. |
| `locationUpdated`| Server -> Customer| `{ lat, lng, workerId }` | Customer receives live worker position. |

---

## 7. Profile & Account

### Endpoints:
| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Get Profile | `GET` | `/api/user/:id` | Fetch current user details. |
| Update Profile | `PATCH` | `/api/user/:id` | Update name, phone, or address. |
| Upload Avatar | `POST` | `/api/user/upload` | Upload profile picture. |
| Logout | `POST` | `/api/user/logout` | Invalidate token and clear session. |

---

## 8. Technical Notes for Mobile Developers

1.  **Security**: All authenticated requests must include the header:  
    `Authorization: bearer <TOKEN>`
2.  **Images**: Use `multipart/form-data` for uploads (Tasks, ID Verification, Avatar).
3.  **Maps**: Integration with Google Maps SDK or Mapbox is recommended for location selection and tracking.
4.  **Notifications**: The app should handle Push Notifications for:
    - New Offers received (for Customers).
    - New Tasks in category (for Workers).
    - New Messages.
    - Offer accepted.

---

*Note: This specification is based on Backend API v1.5.*
