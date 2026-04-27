# FixPay Admin Dashboard - Frontend Technical Specification

This document outlines the requirements, features, and suggested monitoring tools for the FixPay Admin Dashboard. This is intended to guide the development of the admin portal for managing users, tasks, and overall platform health.

---

## 1. Dashboard Overview
The Admin Dashboard is the central command center for FixPay. Its primary goal is to provide full visibility into platform activity, manage user behavior, and ensure trust through identity verification and category management.

### Admin Responsibilities
- **Moderation**: Suspending or deleting users who violate terms.
- **Trust & Safety**: Monitoring identity verification processes.
- **Platform Growth**: Managing service categories.
- **Support**: Viewing task details and offers to resolve disputes.

---

## 2. Core Functional Modules

### A. User Management
Full control over the platform's user base.
- **User List View**: Searchable table of all users (Customers and Workers).
- **Profile Management**: View detailed profiles including sensitive data (SSN, Address).
- **Suspension System**: 
    - **Feature**: Temporarily block users from logging in.
    - **Requirement**: Input field for `suspendUntil` (Date) and `suspensionReason`.
- **Account Recovery**: Ability to restore accounts that were marked for deletion (within 30 days).
- **Role Assignment**: Promote trusted users to `Admin` status.

### B. Category Management
Maintaining the taxonomy of services offered.
- **List Categories**: View all active service categories.
- **Create Category**: Add new service types (e.g., "Plumbing", "Electrical", "Cleaning").
- **Worker Filtering**: View all workers registered under a specific category.

### C. Identity Verification Audit
Monitoring the security layer.
- **Status Monitoring**: Filter users by verification status (`unverified`, `pending`, `verified`, `failed`).
- **Fail Analysis**: View the `failReason` for users who failed automated verification to assist them manually.

### D. Task & Offer Oversight
Monitoring market activity and resolving platform disputes.
- **Task Monitoring**: View open, in-progress, and completed tasks.
- **Task Moderation**: Admins can edit task details (title, description, budget, etc.) if content is inappropriate.
- **Task Deletion**: Admins can remove fraudulent or duplicate tasks.
- **Offer Transparency**: Admins can view all offers submitted for any task to ensure fair pricing and prevent platform bypass.

---

## 3. Recommended Monitoring Features (Proposals)

To make the dashboard truly "helpful" and a monitoring tool, we recommend adding these analytics/views:

| Feature | Description | Benefit |
| :--- | :--- | :--- |
| **KPI Dashboard** | Metrics cards showing Total Users, Active Tasks, and Total Budget volume. | Instant pulse on platform health. |
| **Worker/Customer Ratio** | A chart showing the balance between service providers and seekers. | Identifies if more marketing is needed for one side. |
| **Verification Queue** | A dedicated list of users currently in "pending" verification. | Prioritizes manual review if needed. |
| **Suspension Log** | A history of who was suspended, by whom, and why. | Provides audit trails for admin actions. |
| **Growth Analytics** | Line chart showing new registrations over the last 30 days. | Monitors the impact of marketing campaigns. |

---

## 4. UI/UX Design Guidelines

- **Rich Aesthetics**: Use a professional dark/light mode toggle.
- **Information Density**: Use data tables with pagination and column sorting.
- **Visual Cues**: 
    - Green badges for `Verified` users.
    - Red labels for `Suspended` users.
    - Yellow for `Pending` items.
- **Search & Filter**: Every list (Users, Tasks, Categories) must have a robust search bar and status filters.

---

## 5. Backend API Reference for Frontend

| Action | Method | Endpoint | Access |
| :--- | :--- | :--- | :--- |
| **Get All Users** | `GET` | `/api/user` | Admin Only |
| **Suspend User** | `PATCH` | `/api/user/suspend/:id` | Admin Only |
| **Delete User** | `DELETE` | `/api/user/:id` | Admin Only |
| **Assign Admin** | `PATCH` | `/api/user/assign-admin/:id` | Admin Only |
| **Create Category** | `POST` | `/api/categories` | Admin Only |
| **View Task Offers** | `GET` | `/api/tasks/:taskId/offers` | Admin/Owner |
| **Update Task** | `PATCH` | `/api/tasks/:taskId` | Admin/Owner |
| **Delete Task** | `DELETE` | `/api/tasks/:taskId` | Admin/Owner |
| **Send Message** | `POST` | `/api/messages` | Owner/Worker |
| **Get Chat History** | `GET` | `/api/messages/:taskId/:otherUserId` | Involved Users |
| **Counter Offer** | `PATCH` | `/api/offers/:offerId/counter` | Task Owner |
| **Respond to Counter** | `PATCH` | `/api/offers/:offerId/respond` | Offer Worker |

---

## 6. Security Note
All routes listed above require the `Authorization: Bearer <token>` header. The frontend must ensure that if a user's role is not `admin`, these views are restricted and redirected to the home page.
