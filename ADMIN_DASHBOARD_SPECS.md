# Admin Dashboard - Technical Specifications

This document outlines the features and implementation details of the FixPay Admin Dashboard.

## 🏛️ Routing
*   **Public Access**: `/` (Landing Page), `/login` (Admin Sign-in)
*   **Admin Base**: `/admin` (Protected)
*   **Dashboard**: `/admin` (Overview metrics)
*   **User Management**: `/admin/users`
*   **Reports Management**: `/admin/reports`
*   **Verification Audit**: `/admin/verification`
*   **Marketplace Control**: `/admin/categories`, `/admin/tasks`
*   **System Logs**: `/admin/settings` (Includes backend system logs)

---

## 👥 User Management (`/admin/users`)
*   **Search & Filter**: Find users by name, email, role, or status (Active, Suspended, Banned).
*   **Promotion**: Promote verified users to the Admin role.
*   **Suspension**: 
    *   **Temporary**: Set a `suspendedUntil` date.
    *   **Permanent (Ban)**: Set `isPermanent: true`. This sets `isBanned: true` and records the identity data (SSN/Email) to prevent future re-registration.
*   **Identity Audit**: View full user details including verification status and linked national ID data.

## 🚩 Reports Management (`/admin/reports`)
*   **Community Oversight**: Monitor all user-submitted reports regarding behavior or service quality.
*   **Resolution Workflow**:
    *   **Resolved**: Confirm the report and take necessary action (suspension/ban).
    *   **Dismissed**: Reject invalid or false reports.
*   **Audit Trail**: Tracks which administrator resolved the report and their justification notes.

## 🛡️ AI Verification Audit (`/admin/verification`)
*   **Face Matching**: Displays the comparison of the ID photo vs. the live selfie.
*   **Liveness Verification**: Confirmation of anti-spoofing results from the AI service.
*   **Threshold Review**: Manual overrides for edge cases where similarity scores are near the threshold.

---

## 📊 Dashboard Metrics
*   **Real-time Stats**: Active Users, Pending Reports, Completed Tasks, Total Revenue.
*   **Trends**: Growth charts for user registration and task volume using Recharts.

---

## 🛠️ Tech Stack
*   **React 19**: Modern functional components with hooks.
*   **Material UI**: Premium custom-themed components (Forest Green & Navy Blue).
*   **TanStack Query**: Robust server-state management with automatic refetching.
*   **DataGrid**: High-performance tables for managing large user and task datasets.
*   **Axios**: Centralized API client with automatic token attachment.
