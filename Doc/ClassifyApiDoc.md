# Classify API Documentation

This document describes the classification-related API endpoints for the Pestector application, implemented in `classify.js`. These endpoints handle plant disease classification using VGG-16 and Vision Transformer (ViT) models, trained on the [New Plant Diseases Dataset](https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset). The endpoints support image uploads, scan limit checks, and statistics retrieval for both authenticated users and guests. All routes are prefixed with the base URL: `/api/classify`.

## Table of Contents
- [POST /](#post-)
- [GET /stats](#get-stats)

## POST /
**Description**: Classifies a plant leaf image to detect diseases using VGG-16 or ViT models, optionally enhanced with Gemini for advanced analytics. Stores the image, saves classification results, and generates a treatment plan if a disease is detected. Supports both authenticated users and guests, with scan limits enforced.

**Headers**:
- `Authorization`: Bearer token (optional, required for authenticated users).
- `X-API-KEY`: API key for accessing the classification service (required).

**Request Body** (multipart/form-data):
- `file` (file, required): Image file (JPEG, PNG, WebP; max 10MB).
- `plantId` (string, optional): ID of the plant being classified.

**Query Parameters**:
- `model_choice` (string, optional, default: `"best"`): Model to use (`"vit"`, `"vgg"`, or `"best"`).
- `use_gemini` (string, optional, default: `"false"`): Use Gemini for advanced analytics (`"true"` or `"false"`).
- `low_confidence_threshold` (string, optional, default: `"0.7"`): Confidence threshold for warnings (0 to 1).

**Responses**:
- `200`: Classification successful, returns results, metadata, and subscription info.
- `400`: Invalid file, query parameters, or image validation failure.
- `401`: Missing X-API-KEY header.
- `403`: Scan limit reached or invalid API key.
- `404`: User not found (for authenticated users).
- `500`: Server error or classification service failure.
- `504`: Classification request timed out.

**Response Body**:
```json
{
  "status": "success",
  "overall_best_prediction": {
    "plant": "Tomato",
    "condition": "Powdery Mildew",
    "confidence": 0.92,
    "confidence_percent": 92,
    "model_source": "ViT",
    "label": "Tomato___Powdery_Mildew",
    "disease_info": "Powdery mildew is a fungal disease...",
    "treatment_recommendations": "Apply fungicide...",
    "reason_for_disease": "High humidity...",
    "data_source": "ViT",
    "gemini_highlighted": false
  },
  "vit_predictions": [...],
  "tf_predictions": [...],
  "metadata": {
    "filename": "image-123456789.jpg",
    "content_type": "image/jpeg",
    "save_path": "/Uploads/userid/image-123456789.jpg",
    "timestamp": "2025-06-08T18:45:00.000Z",
    "image_details": {}
  },
  "processing_time_seconds": 0.25,
  "model_choice_used": "best",
  "low_confidence_threshold": 0.7,
  "history_id": "mongo-object-id",
  "treatment_plan_id": "mongo-object-id",
  "warnings": [
    {
      "type": "low_confidence",
      "message": "Confidence (65%) is below threshold (70%)"
    }
  ],
  "subscription_info": {
    "plan": "free",
    "scan_limit": 10,
    "scans_used": 2,
    "scans_remaining": 8,
    "has_advanced_analytics": false
  }
}
```

**Notes**:
- Images are validated for minimum dimensions (64x64) and format (JPEG, PNG, WebP).
- Results are cached for 1 hour using an MD5 hash of the image buffer to avoid redundant classifications.
- Scan limits are enforced based on subscription plans (for users) or `MAX_GUEST_SCANS` (for guests).
- Treatment plans are created for non-healthy conditions, reusing recent plans (within 24 hours) if available.
- Analytics are recorded in the `Analytics` model for each classification.
- Images are saved in `/Uploads/<userId or guestId>/` with unique filenames.
- Errors trigger cleanup of database entries (history, treatment plan, analytics) to maintain consistency.

## GET /stats
**Description**: Retrieves classification statistics, including total scans, scans by user type, plant, condition, model, and performance metrics (average confidence and processing time). Supports filtering by date range, user type, and subscription plan (admin-only).

**Headers**:
- `Authorization`: Bearer token (optional, required for authenticated users or admins).
- `X-API-KEY`: API key for accessing stats (required).

**Query Parameters**:
- `dateStart` (string, optional, default: 30 days ago): Start date in ISO 8601 format (e.g., `2025-04-01`).
- `dateEnd` (string, optional, default: now): End date in ISO 8601 format (e.g., `2025-06-08`).
- `userType` (string, optional, default: `"all"`): Filter by user type (`"all"`, `"guest"`, `"user"`; admin-only for `"all"`).
- `plan` (string, optional): Filter by subscription plan (e.g., `"free"`, `"premium"`, `"guest"`; admin-only).

**Responses**:
- `200`: Statistics retrieved successfully.
- `400`: Invalid query parameters (e.g., invalid dates, userType, or plan).
- `401`: Missing X-API-KEY or authentication required.
- `403`: Non-admin users attempting to filter by `userType="all"` or `plan`.
- `500`: Server error.

**Response Body**:
```json
{
  "status": "success",
  "date_range": {
    "start": "2025-04-01T00:00:00.000Z",
    "end": "2025-06-08T23:59:59.999Z"
  },
  "total_scans": 1000,
  "scans_by_user_type": {
    "users": 600,
    "guests": 400
  },
  "scans_by_plan": {
    "free": 500,
    "premium": 100,
    "guest": 400
  },
  "scans_by_plant": {
    "Tomato": 300,
    "Potato": 200
  },
  "scans_by_condition": {
    "Powdery Mildew": 150,
    "Healthy": 500
  },
  "scans_by_model": {
    "ViT": 600,
    "VGG-16": 400
  },
  "average_confidence": 0.92,
  "average_processing_time": 0.25,
  "top_plants": [
    { "plant": "Tomato", "count": 300 },
    { "plant": "Potato", "count": 200 }
  ],
  "top_conditions": [
    { "condition": "Healthy", "count": 500 },
    { "condition": "Powdery Mildew", "count": 150 }
  ]
}
```

**Notes**:
- Results are cached for 10 minutes using a hash of query parameters and scope.
- Non-admin users and guests can only access their own stats (`userId` or `guestId` scope).
- Admins can filter by `userType` and `plan`, with `scans_by_plan` included in the response.
- Date ranges are inclusive, with `dateEnd` extended to the end of the day.
- Statistics are aggregated from the `Analytics` model, with subscription details cross-referenced for plan-based filtering.

## Notes
- The classification endpoint integrates with a Python API (`PYTHON_API_URL`) for model inference.
- Scan limits are checked before processing to ensure compliance with subscription plans or guest limits.
- Images are stored in the filesystem and referenced in the `History` and `Analytics` models.
- The `stats` endpoint provides detailed insights for admins, with restricted access for non-admins.
- All endpoints require an `X-API-KEY` header for security.
- The dataset used for training (VGG-16 and ViT) contains ~87,000 RGB images across 38 classes, split 80/20 for training/validation.