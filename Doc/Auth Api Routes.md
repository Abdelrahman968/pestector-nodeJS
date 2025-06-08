# API Documentation for Authentication Routes

This document provides detailed information about the authentication-related API endpoints for the Pestector application. All endpoints are prefixed with the base URL: `/api/auth`.

## Table of Contents
1. [POST /register](#post-register)
2. [POST /2fa/enable](#post-2faenable)
3. [POST /2fa/disable](#post-2fadisable)
4. [POST /2fa/login-verify](#post-2falogin-verify)
5. [POST /login](#post-login)
6. [GET /verify](#get-verify)
7. [POST /refresh-token](#post-refresh-token)
8. [POST /location](#post-location)
9. [GET /profile](#get-profile)
10. [POST /link-guest](#post-link-guest)
11. [PUT /profile](#put-profile)
12. [POST /logout](#post-logout)
13. [DELETE /account](#delete-account)
14. [POST /forgot-password](#post-forgot-password)
15. [POST /reset-password](#post-reset-password)
16. [GET /validate-reset-token/:token](#get-validate-reset-token)

---

## POST /register
**Description**: Registers a new user in the system.

**Request Body**:
- `username` (string, required): The user's unique username.
- `email` (string, required): The user's email address.
- `password` (string, required): The user's password.
- `phoneNumber` (string, required): The user's phone number.
- `fullName` (string, optional): The user's full name.
- `latitude` (number, optional): User's latitude for location-based services.
- `longitude` (number, optional): User's longitude for location-based services.
- `profileImage` (file, optional): User's profile image (JPEG, PNG, or GIF, max 5MB).

**Responses**:
- `201`: User registered successfully.
- `400`: Missing required fields.
- `409`: Username, email, or phone number already exists.
- `500`: Server error.

**Notes**:
- Automatically adds country code to phone number if not provided, based on geolocation.
- Links guest history to the user if a `guestId` cookie is present.

---

## POST /2fa/enable
**Description**: Enables two-factor authentication (2FA) for the authenticated user.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: 2FA enabled successfully, returns QR code and secret.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

**Response Body**:
```json
{
  "message": "2FA enabled successfully",
  "secret": "base32-secret",
  "qrCode": "data:image/png;base64,..."
}
```

---

## POST /2fa/disable
**Description**: Disables 2FA for the authenticated user.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: 2FA disabled successfully.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

---

## POST /2fa/login-verify
**Description**: Verifies a 2FA token during login for users with 2FA enabled.

**Request Body**:
- `userId` (string, required): The ID of the user.
- `token` (string, required): The 2FA code from the authenticator app.

**Responses**:
- `200`: 2FA verified, returns JWT token and user details.
- `400`: Missing userId or token.
- `401`: Invalid 2FA token.
- `404`: User not found.
- `500`: Server error.

**Response Body**:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "location": { "latitude": 31.0312, "longitude": 31.3347 }
  }
}
```

---

## POST /login
**Description**: Authenticates a user and returns a JWT token.

**Request Body**:
- `username` (string, required): The user's username.
- `password` (string, required): The user's password.
- `latitude` (number, optional): User's latitude.
- `longitude` (number, optional): User's longitude.

**Responses**:
- `200`: Login successful, returns JWT token and user details (or 2FA prompt if enabled).
- `401`: Invalid username or password.
- `500`: Server error.

**Response Body (without 2FA)**:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "location": { "latitude": 31.0312, "longitude": 31.3347 }
  }
}
```

**Response Body (with 2FA)**:
```json
{
  "message": "2FA required",
  "userId": "user-id"
}
```

---

## GET /verify
**Description**: Verifies the validity of the JWT token and returns the user's role.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Token is valid, returns user role.
- `401`: Invalid or missing token.

**Response Body**:
```json
{
  "status": "success",
  "role": "user"
}
```

---

## POST /refresh-token
**Description**: Refreshes an expired JWT token.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: New token generated.
- `401`: No token provided.
- `403`: Invalid or expired token.
- `404`: User not found.

**Response Body**:
```json
{
  "token": "new-jwt-token"
}
```

---

## POST /location
**Description**: Updates the authenticated user's location.

**Headers**:
- `Authorization`: Bearer token (required).

**Request Body**:
- `latitude` (number, required): User's latitude.
- `longitude` (number, required): User's longitude.

**Responses**:
- `200`: Location updated successfully.
- `400`: Missing latitude or longitude.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

**Response Body**:
```json
{
  "message": "Location updated successfully",
  "location": { "latitude": 31.0312, "longitude": 31.3347 }
}
```

---

## GET /profile
**Description**: Retrieves the authenticated user's profile information.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Profile retrieved successfully.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

**Response Body**:
```json
{
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "fullName": "Full Name",
    "phoneNumber": "+1234567890",
    "profileImage": "/uploads/image.jpg",
    "location": { "latitude": 31.0312, "longitude": 31.3347 },
    "role": "user",
    "subscription": { "currentPlan": "free", "status": "active", "features": {} },
    "twoFactorSecret": true
  },
  "subscription_info": {
    "plan": "free",
    "scan_limit": 10,
    "scans_used": 2,
    "scans_remaining": 8,
    "has_advanced_analytics": false,
    "priority_support": false,
    "api_access": false
  }
}
```

---

## POST /link-guest
**Description**: Links a guest's history to the authenticated user's account.

**Headers**:
- `Authorization`: Bearer token (required).

**Request Body**:
- `guestId` (string, required): The guest ID to link.

**Responses**:
- `200`: Guest history linked successfully.
- `400`: Missing guest ID.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

---

## PUT /profile
**Description**: Updates the authenticated user's profile, including optional profile image upload.

**Headers**:
- `Authorization`: Bearer token (required).

**Request Body** (multipart/form-data):
- `username` (string, optional): New username.
- `email` (string, optional): New email.
- `password` (string, optional): New password.
- `phoneNumber` (string, optional): New phone number.
- `fullName` (string, optional): New full name.
- `location` (object, optional): `{ latitude: number, longitude: number }`.
- `subscription` (object, optional, admin-only): Subscription details.
- `profileImage` (file, optional): New profile image (JPEG, PNG, GIF, max 5MB).

**Responses**:
- `200`: Profile updated successfully.
- `401`: Authentication required (guest users not allowed).
- `403`: Non-admin users attempting to update subscription.
- `404`: User not found.
- `500`: Server error.

**Response Body**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user-id",
    "fullName": "Full Name",
    "profileImage": "/uploads/image.jpg",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "phoneNumber": "+1234567890",
    "location": { "latitude": 31.0312, "longitude": 31.3347 },
    "subscription": { "currentPlan": "free", "status": "active", "features": {} }
  }
}
```

---

## POST /logout
**Description**: Logs out the user by clearing the token cookie.

**Responses**:
- `200`: Logged out successfully.
- `500`: Server error.

**Response Body**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## DELETE /account
**Description**: Deletes the authenticated user's account and associated history/chats.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Account deleted successfully.
- `401`: Authentication required (guest users not allowed).
- `404`: User not found.
- `500`: Server error.

---

## POST /forgot-password
**Description**: Initiates a password reset by sending a reset link to the user's email.

**Request Body**:
- `email` (string, required): User's email address.

**Responses**:
- `200`: Generic success message (sent even if email not found to prevent enumeration).
- `400`: Missing email address.
- `429`: Too many password reset requests (rate-limited).
- `500`: Server error.

**Response Body**:
```json
{
  "message": "If your email address is registered, you will receive a password reset link."
}
```

**Notes**:
- Rate-limited to 5 requests per IP per hour.

---

## POST /reset-password
**Description**: Resets the user's password using a valid reset token.

**Request Body**:
- `token` (string, required): Password reset token.
- `newPassword` (string, required): New password (min 8 characters, must include uppercase, lowercase, number, and special character).

**Responses**:
- `200`: Password reset successfully.
- `400`: Invalid token, expired token, or weak password.
- `500`: Server error.

**Response Body**:
```json
{
  "success": true,
  "message": "Password has been reset successfully.",
  "emailStatus": {
    "sent": true,
    "message": "Confirmation email sent successfully"
  },
  "timestamp": "2025-06-08T18:27:00.000Z"
}
```

---

## GET /validate-reset-token/:token
**Description**: Validates a password reset token before showing the reset form.

**Parameters**:
- `token` (string, required): Password reset token.

**Responses**:
- `200`: Token is valid, includes time remaining and masked email.
- `400`: Invalid or expired token.
- `500`: Server error.

**Response Body**:
```json
{
  "success": true,
  "message": "Token is valid",
  "timeRemaining": 45,
  "email": "us***@example.com"
}
```

---

## Notes
- All endpoints requiring authentication use a Bearer token in the `Authorization` header.
- The `/forgot-password` endpoint is rate-limited to prevent abuse.
- Profile images are stored in the `uploads/` directory with unique filenames.
- Geolocation is determined using client-provided coordinates, browser Geolocation API, or IP-based lookup as a fallback.
- 2FA uses the `speakeasy` library for TOTP-based authentication and QR code generation.
- Password reset tokens are hashed before storage and valid for 1 hour.