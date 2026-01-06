# Authentication System Overview

Your application uses a **Hybrid Authentication Strategy** designed for maximum reliability. It primarily attempts to use secure **HTTP-Only Cookies** but automatically falls back to **Bearer Tokens** (stored in `localStorage`) if cookies fail (e.g., due to third-party cookie blocking, cross-site issues, or local development environments).

## 1. Login & Token Generation

### Google Login
1.  **User Trigger**: User clicks "Sign in with Google".
2.  **Google Exchange**: After Google approves, your server (`auth.controller.js`) exchanges the code for a Google profile.
3.  **User Creation/Lookup**: The server finds or creates the user in MongoDB.
4.  **Token Creation**: A **JWT (JSON Web Token)** is generated for the user.
5.  **Response**:
    -   **Cookie**: The server attempts to set an `httpOnly` cookie named `token`.
    -   **JSON Body**: The server *also* sends the same JWT in the response body.
6.  **Client Handling** (`api/auth/callback/google/route.ts`):
    -   The Next.js API route receives the token.
    -   It redirects the user to `/home` and appends the token to the URL (`/home?token=eyJ...`) so the client can access it.

### Phone Verification (OTP)
1.  **Verification**: User verifies their phone number via Twilio.
2.  **Merging**: The server checks if the phone matches an existing Google user and merges accounts if necessary.
3.  **Response**: similar to Google, it returns a token in both the Cookie and the JSON body.

## 2. Token Storage

The application stores the authentication token in **two places** simultaneously to ensure you never get "locked out":

1.  **Browser Cookie (`token`)**:
    -   **Type**: `httpOnly`, `Secure` (in production).
    -   **Purpose**: Automatic authentication for server-side requests and Next.js middleware.
    -   **Security**: High. JavaScript cannot read this, protecting it from XSS attacks.

2.  **LocalStorage (`token`)**:
    -   **Type**: Browser storage.
    -   **Purpose**: Fallback authentication. If the cookie is blocked or missing, the client reads this.
    -   **Client Code**: In `home/page.tsx` (and others), we explicitly check for the token in the URL or storage:
        ```javascript
        const token = searchParams.get('token');
        if (token) localStorage.setItem('token', token);
        ```

## 3. Making Requests (Client -> Server)

When your frontend (React/Next.js) makes a request to the backend (Node/Express), it sends credentials in **two ways**:

1.  **Cookies**: The browser automatically attaches the `token` cookie to requests (handled by `credentials: true` in Axios).
2.  **Authorization Header**: We added an **Interceptor** in `services/api.ts` that manually attaches the token from LocalStorage:
    ```javascript
    config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    ```

## 4. Server Validation

The server (`authMiddleware.js`) is designed to accept *either* method. It checks in this order:

1.  **Check Cookie**: Is there a `req.cookies.token`? If yes, use it.
2.  **Check Header**: If no cookie, is there an `Authorization: Bearer <token>` header? If yes, use it.

This "Double-Check" ensures that if one method fails (e.g., Safari blocks the cookie), the other method (header) still succeeds.

## 5. Route Protection

### Server-Side (Middleware)
-   File: `middleware.ts`
-   **Relaxed Rules**: We removed strict checks for `/home` to prevent loop issues. It mainly protects `/dashboard`.
-   **Redirect**: If a logged-in user tries to visit `/login`, they are redirected to `/home`.

### Client-Side (Pages)
-   File: `home/page.tsx`, `login/page.tsx`
-   **Logic**: The page code runs in the browser. It checks `localStorage`.
    -   If you are on Home but have no token? -> **Logout & Redirect to Login**.
    -   If you are on Login but *have* a token? -> **Redirect to Home**.

## Summary
By combining **Cookies** (best for security) with **LocalStorage + Bearer Headers** (best for reliability), your app provides a robust login experience that works across different browsers and hosting environments (Vercel + Render).
