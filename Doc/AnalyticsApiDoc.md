# Analytics API Documentation

This document describes the analytics-related API endpoints for the Pestector application, implemented in `analytics.js`. These endpoints provide insights into user activity and system performance, including scan statistics, plant disease trends, and model usage. The endpoints are designed for both authenticated users (to access their own analytics) and administrators (to access system-wide analytics with an API key). All routes are prefixed with the base URL: `/api/analytics`.

## Table of Contents
- [GET /user](#get-user)
- [GET /](#get-)

## GET /user
**Description**: Retrieves analytics data specific to the authenticated user, including scan counts by month, most common plant conditions (diseases), and most common plants scanned.

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Successfully retrieved user analytics.
- `401`: Authentication required (guest users not allowed).
- `500`: Server error.

**Response Body**:
```json
{
  "status": "success",
  "analytics": {
    "scansByMonth": [
      { "_id": { "year": 2025, "month": 6 }, "count": 15 },
      ...
    ],
    "commonConditions": [
      { "_id": "Powdery Mildew", "count": 5 },
      ...
    ],
    "commonPlants": [
      { "_id": "Tomato", "count": 8 },
      ...
    ]
  }
}
```

**Notes**:
- Requires a valid JWT token for an authenticated user.
- Excludes non-disease or uninformative conditions (e.g., "healthy", "Unknown") from common conditions.
- Limits the response to the top 5 conditions and plants for brevity.

## GET /
**Description**: Retrieves system-wide analytics for administrators, including user growth, scan volume, scans by user type, common conditions, common plants, model usage, and performance metrics (average processing time and confidence). Requires an API key.

**Headers**:
- `x-api-key-analytics`: Admin API key (required).

**Query Parameters**:
- `dateStart` (string, optional): Start date for filtering data (ISO format, e.g., `2025-01-01`).
- `dateEnd` (string, optional): End date for filtering data (ISO format, e.g., `2025-06-08`).

**Responses**:
- `200`: Successfully retrieved admin analytics.
- `403`: Invalid or missing API key.
- `500`: Server error.

**Response Body**:
```json
{
  "status": "success",
  "queryDateRange": {
    "start": "2025-01-01",
    "end": "2025-06-08"
  },
  "analytics": {
    "userGrowth": [
      { "_id": { "year": 2025, "month": 1 }, "count": 100 },
      ...
    ],
    "scanVolume": [
      { "_id": { "year": 2025, "month": 1 }, "count": 500 },
      ...
    ],
    "scansByUserTypeOverTime": [
      {
        "year": 2025,
        "month": 1,
        "counts": { "registered": 300, "guest": 200 }
      },
      ...
    ],
    "commonConditions": [
      { "_id": "Powdery Mildew", "count": 150 },
      ...
    ],
    "commonPlants": [
      { "_id": "Tomato", "count": 200 },
      ...
    ],
    "modelUsage": [
      { "_id": "VGG-16", "count": 600 },
      { "_id": "ViT", "count": 400 }
    ],
    "averageProcessingTime": "0.250",
    "averageConfidence": "0.920",
    "summary": {
      "userCount": 500,
      "guestCount": 1000,
      "totalScans": 10000
    }
  }
}
```

**Notes**:
- Requires a valid API key stored in `process.env.API_ANA_KEY`.
- Supports date filtering with `dateStart` and `dateEnd` query parameters.
- Excludes non-disease or uninformative conditions (e.g., "healthy", "Unknown") from common conditions.
- Limits common conditions and plants to the top 10 results.
- Performance metrics (processing time and confidence) are averaged across all scans in the specified date range.
- If no date range is provided, returns data for all time.

## Notes
- The analytics data is sourced from the `Analytics` model, which stores scan-related information, including timestamps, classification results (condition, plant, model source, confidence), and processing times.
- User growth is calculated based on the `createdAt` field in the `User` model, while guest counts use the `GuestUser` model.
- Date filtering ensures precise analytics within the specified range, with `dateEnd` adjusted to include the entire day.
- The `scansByUserTypeOverTime` response distinguishes between registered and guest users based on the presence of a `userId` in the `Analytics` model.