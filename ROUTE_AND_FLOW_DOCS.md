# Application Documentation

## 1. API Routes (Server)

All API routes are prefixed with `/api/auth` and handled by the authentication controller.

| Method | Endpoint | Description | Auth Required | Middleware / Security |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/google` | Google OAuth authentication | No | None |
| **POST** | `/send-otp` | Sends OTP to phone/email | No | **Rate Limiter** (3 req/24h) |
| **POST** | `/verify-otp` | Verifies the sent OTP | No | None |
| **POST** | `/refresh` | Refreshes access token | No | None |
| **GET** | `/users/:username` | Get public user profile | No | None |
| **POST** | `/register-details` | Complete user registration | **Yes** | **Protect**, **CSRF Protection** |
| **POST** | `/logout` | User logout | No | None |
| **GET** | `/me` | Get current logged-in user | **Yes** | **Protect** |
| **POST** | `/avatar` | Upload user avatar | **Yes** | **Protect**, Multer (File Upload) |

## 2. Application Flow

### User Onboarding Flow
1. **Landing Page (`/`)**: Users arrive at the main landing page.
2. **Authentication**:
    - Users choose **Login** (`/login`) or **Sign Up** (`/signup`).
    - **Google Auth**: Redirects to Google, returns with auth token.
    - **OTP Auth**: User requests OTP -> System sends OTP (rate limited) -> User verifies OTP.
3. **Registration Completion (New Users)**:
    - If details are missing, user is directed to `/register-details`.
    - User fills in profile info (Name, Bio, etc.).
    - System validates CSRF token and Access Token before saving.
4. **Dashboard / Home (`/home`)**:
    - Upon successful auth, users are redirected to the main feed.

### Navigation
- **Home**: Main feed of content.
- **Profile (`/[username]`)**: Public profile view.
- **Dashboard (`/dashboard`)**: Protected area for user-specific data (guarded by Middleware).

## 3. Security Implementation

### Server-Side Security
*   **Authentication Middleware (`protect`)**:
    *   Verifies JSON Web Token (JWT) from `access_token` cookie.
    *   Decodes user ID and attaches to `req.user`.
    *   Returns `401` if token is missing or invalid.

*   **CSRF Protection (`csrfMiddleware`)**:
    *   **Double-Submit Cookie Pattern**:
        *   Server sets a `csrf_token` cookie (HTTP-only: false, so client can read it).
        *   Client must read this cookie and send it back in the `x-csrf-token` header for mutating requests (POST, PUT, etc.).
    *   Verifies that the cookie value matches the header value.
    *   Prevents Cross-Site Request Forgery attacks.

*   **Rate Limiting (`rateLimiterMiddleware`)**:
    *   Implemented using `rate-limiter-flexible` (Memory store).
    *   Limits OTP requests to **3 per 24 hours** per IP/Phone.
    *   Prevents abuse of the SMS/Email gateway.

*   **CORS Configuration**:
    *   Restricts access to the defined `CLIENT_URL`.
    *   Allows credentials (cookies) to be sent across origins.

### Client-Side Security
*   **Next.js Middleware (`middleware.ts`)**:
    *   Runs before request completion.
    *   Checks for presence of `access_token` or `refresh_token` cookies.
    *   **Redirect rules**:
        *   Attempts to access protected routes (e.g., `/dashboard`) without token -> Redirect to `/login`.
        *   Attempts to access auth pages (`/login`, `/signup`) while logged in -> Redirect to `/home`.
