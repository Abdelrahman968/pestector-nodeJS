# General API Documentation

This document describes the general-purpose API endpoints for the Pestector application, implemented in `general.js`. These endpoints provide system-wide statistics and health check information. The `/` endpoint returns user-specific or system-wide statistics depending on the user's role, while the `/health` endpoint provides system health information. All routes are prefixed with the base URL: `/api/general`.

## Table of Contents
- [GET /](#get-)
- [GET /health](#get-health)

## GET /
**Description**: Retrieves statistics for the authenticated user or system-wide statistics for admins. For non-admin users, it returns counts of their classification history and chat entries, along with their last login time. For admins, it returns system-wide counts of users, guests, classification history, and chats.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Statistics retrieved successfully.
- `401`: Authentication required (guest users not allowed).
- `500`: Server error.

**Response Body** (Non-Admin User):
```json
{
  "status": "success",
  "user_stats": {
    "history_count": 10,
    "chat_count": 5,
    "last_login": "2025-06-08T18:53:00.000Z"
  }
}
```

**Response Body** (Admin):
```json
{
  "status": "success",
  "system_stats": {
    "user_count": 500,
    "guest_count": 1000,
    "history_count": 10000,
    "chat_count": 2000
  }
}
```

**Response Body** (Error):
```json
{
  "status": "error",
  "message": "Failed to retrieve stats"
}
```

**Notes**:
- Requires authentication via a valid JWT token.
- Guest users are denied access and receive a 401 response.
- Non-admin users receive statistics specific to their `userId` from the `History` and `Chat` models.
- Admins receive aggregated counts from the `User`, `GuestUser`, `History`, and `Chat` models.
- The `last_login` field for non-admin users is sourced from the `User` model's `lastLogin` field, formatted as an ISO string or "N/A" if not available.

## GET /health
**Description**: Provides a health check for the system, including server uptime, current timestamp, and MongoDB connection status. This endpoint is publicly accessible and does not require authentication.

**Responses**:
- `200`: Health check successful.
- `500`: Server error.

**Response Body** (Success):
```json
{
  "status": "success",
  "uptime": "2h 15m 30.12s",
  "timestamp": "6/8/2025, 6:55:00 PM",
  "database": "connected"
}
```

**Response Body** (Error):
```json
{
  "status": "error",
  "message": "Health check failed"
}
```

**Notes**:
- The `uptime` is formatted as hours, minutes, and seconds (e.g., `2h 15m 30.12s`).
- The `timestamp` is formatted in a human-readable format using `toLocaleString()`.
- The `database` field reflects the MongoDB connection status: `connected`, `connecting`, `disconnecting`, or `disconnected`.
- Errors during the health check are logged to the console with stack traces for debugging.

## Notes
- The `/` endpoint requires authentication and restricts guest access to ensure data privacy.
- The `/health` endpoint is designed for monitoring and debugging, accessible without authentication.
- Statistics are aggregated from the `User`, `GuestUser`, `History`, and `Chat` models.
- The `formatUptime` helper function converts raw uptime (in seconds) to a human-readable format.