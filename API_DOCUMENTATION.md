# API Documentation

## Overview
This API powers the Hoocup application, handling user authentication (Google OAuth, Phone/Email OTP), user profiles, social feed, and administrative functions.

**Base URL**: `http://localhost:5000/api` (Development) / `https://hoocup.vercel.app/api` (Production)

## Authentication (`/auth`)

### 1. Google OAuth
**POST** `/auth/google`

Authenticates a user via Google OAuth 2.0. Creates a new user if one doesn't exist.

*   **Body**:
    ```json
    {
      "code": "4/0A...",
      "redirect_uri": "http://localhost:3000/api/auth/callback/google" // Optional, defaults to env
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "user": { ... }
    }
    ```
*   **Cookies Set**: `access_token`, `refresh_token`, `csrf_token`

### 2. Send Phone OTP
**POST** `/auth/send-otp`
*Rate Limit: 3 requests per 24 hours*

Sends a One-Time Password (OTP) to the specified phone number via Twilio (or mock in dev).

*   **Body**:
    ```json
    {
      "phone": "+919999999999"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "message": "OTP sent successfully",
      "status": "pending"
    }
    ```

### 3. Verify Phone OTP
**POST** `/auth/verify-otp`

Verifies the phone OTP. If the user exists, logs them in. If it's part of the signup flow, it links the phone number to the current account.

*   **Body**:
    ```json
    {
      "phone": "+919999999999",
      "code": "123456"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "user": { ... }
    }
    ```

### 4. Send Email OTP
**POST** `/auth/email/send`

Sends an OTP to the user's email access. Used for alternative login.

*   **Body**:
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "message": "OTP sent successfully"
    }
    ```

### 5. Verify Email OTP
**POST** `/auth/email/verify`

Verifies the email OTP and logs the user in.

*   **Body**:
    ```json
    {
      "email": "user@example.com",
      "otp": "123456"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "user": { ... }
    }
    ```

### 6. Refresh Token
**POST** `/auth/refresh`

Refreshes the short-lived access token using the httpOnly refresh cookie.

*   **Response (200 OK)**:
    ```json
    {
      "success": true
    }
    ```

### 7. Register Details
**POST** `/auth/register-details`
* Protected *

Finalizes user registration by updating profile details.

*   **Headers**: `x-csrf-token` (required)
*   **Body**:
    ```json
    {
      "username": "cooluser",
      "first_name": "John",
      "last_name": "Doe",
      "dob": "1990-01-01",
      "bio": "Hello world",
      "avatar": "https://..." // Optional
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "message": "Profile updated successfully",
      "user": { ... }
    }
    ```

### 8. Logout
**POST** `/auth/logout`

Clears auth cookies.

*   **Response (200 OK)**:
    ```json
    {
      "message": "Logged out"
    }
    ```

### 9. Get Current User
**GET** `/auth/me`
*Protected*

Returns the currently logged-in user's profile.

*   **Response (200 OK)**:
    ```json
    {
      "_id": "...",
      "username": "...",
      ...
    }
    ```

### 10. Photo Management
**POST** `/auth/photos`
*Protected* -- Upload up to 4 photos.
**PATCH** `/auth/photos/set-profile`
*Protected* -- Set a specific photo as profile picture.
**DELETE** `/auth/photos/:photoId`
*Protected* -- Delete a photo.

## Users (`/users`)

### 1. Get Feed
**GET** `/users/feed`
*Protected*

Returns a paginated list of active users to display in the feed.

*   **Query Params**:
    *   `page`: Page number (default: 1)
    *   `limit`: Items per page (default: 10)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "count": 10,
      "data": [
        {
          "_id": "...",
          "username": "...",
          "avatar": "...",
          "bio": "...",
          "photos": [ ... ]
        }
      ]
    }
    ```

### 2. Get User Profile
**GET** `/users/:username`

Returns public profile information for a specific user.

*   **Response (200 OK)**:
    ```json
    {
      "_id": "...",
      "username": "...",
      "bio": "...",
      "photos": [ ... ]
    }
    ```

## Admin (`/admin`)

*All admin routes require an `admin` role.*

### 1. Get Dashboard Stats
**GET** `/admin/stats`

Returns counts of total, active, suspended, and banned users.

*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "totalUsers": 100,
      "activeUsers": 90,
      "suspendedUsers": 5,
      "bannedUsers": 5
    }
    ```

### 2. Get All Users
**GET** `/admin/users`

Paginated list of all users.

*   **Query Params**: `page`, `limit`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [ ... ]
    }
    ```

### 3. Create User (Admin)
**POST** `/admin/users`

Manually create a user.

### 4. Update User Status
**PATCH** `/admin/users/:id/status`

Ban, suspend, or activate a user.

*   **Body**:
    ```json
    {
      "status": "banned" // 'active', 'suspended', 'banned'
    }
    ```

### 5. Delete User
**DELETE** `/admin/users/:id`

Soft deletes a user.

## Avatars (`/avatars`)

### 1. Upload Avatar
**POST** `/avatars`
*Protected*

Upload a simplified single avatar image.

*   **Body**: `multipart/form-data` with `avatar` field.

## Error Codes
| Status Code | Description |
| :--- | :--- |
| `400` | Bad Request (Validation failed, Duplicate user) |
| `401` | Unauthorized (Invalid token, Session expired) |
| `403` | Forbidden (Admin access required, Account banned) |
| `404` | Not Found |
| `429` | Too Many Requests (OTP rate limit exceeded) |
| `500` | Server Error |
