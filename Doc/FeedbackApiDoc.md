# Feedback API Documentation

This document describes the feedback-related API endpoints for the Pestector application, implemented in `feedback.js`. These endpoints allow authenticated users to submit, retrieve, and update feedback on model classification results, specifically linked to classification history entries. All routes are prefixed with the base URL: `/api/feedback`.

## Table of Contents
- [POST /](#post-)
- [GET /](#get-)
- [PUT /:id](#put-id)

## POST /
**Description**: Submits feedback for a specific classification history entry. Feedback includes the type of feedback, the correct label (if the model's prediction was incorrect), and optional comments. Users can only submit one feedback per history entry.

**Headers**:
- `Authorization`: Bearer token (required).

**Request Body**:
- `historyId` (string, required): The ID of the classification history entry (from the `History` model).
- `feedbackType` (string, required): The type of feedback (e.g., "incorrect_prediction", "suggestion").
- `correctLabel` (string, required): The correct classification label if the model's prediction was wrong.
- `comments` (string, optional): Additional comments or details about the feedback.

**Responses**:
- `201`: Feedback submitted successfully.
- `400`: Missing required fields or feedback already exists for the history entry.
- `401`: Authentication required (guest users not allowed).
- `500`: Server error.

**Response Body** (Success):
```json
{
  "status": "success",
  "feedback": {
    "_id": "mongo-object-id",
    "userId": "user-id",
    "historyId": "history-id",
    "feedbackType": "incorrect_prediction",
    "correctLabel": "Healthy",
    "comments": "The model incorrectly identified this as Powdery Mildew.",
    "createdAt": "2025-06-08T18:53:00.000Z",
    "updatedAt": "2025-06-08T18:53:00.000Z"
  }
}
```

**Response Body** (Error):
```json
{
  "status": "error",
  "message": "Missing required fields"
}
```

**Notes**:
- Requires authentication via a valid JWT token.
- Ensures that only one feedback entry per `historyId` per user is allowed.
- Feedback is stored in the `ModelFeedback` collection with a reference to the user and history entry.

## GET /
**Description**: Retrieves all feedback entries submitted by the authenticated user, sorted by creation date (newest first).

**Headers**:
- `Authorization`: Bearer token (required).

**Responses**:
- `200`: Feedback retrieved successfully.
- `401`: Authentication required (guest users not allowed).
- `500`: Server error.

**Response Body**:
```json
{
  "status": "success",
  "feedback": [
    {
      "_id": "mongo-object-id",
      "userId": "user-id",
      "historyId": "history-id",
      "feedbackType": "incorrect_prediction",
      "correctLabel": "Healthy",
      "comments": "The model incorrectly identified this as Powdery Mildew.",
      "createdAt": "2025-06-08T18:53:00.000Z",
      "updatedAt": "2025-06-08T18:53:00.000Z"
    }
  ]
}
```

**Notes**:
- Only returns feedback entries associated with the authenticated user.
- Results are sorted by `createdAt` in descending order (newest first).

## PUT /:id
**Description**: Updates an existing feedback entry for the authenticated user, identified by the feedback ID.

**Headers**:
- `Authorization`: Bearer token (required).

**Parameters**:
- `id` (string, required): The ID of the feedback entry to update.

**Request Body**:
- `historyId` (string, optional): The ID of the classification history entry.
- `feedbackType` (string, optional): The updated feedback type.
- `correctLabel` (string, optional): The updated correct label.
- `comments` (string, optional): Updated comments.

**Responses**:
- `200`: Feedback updated successfully.
- `401`: Authentication required (guest users not allowed).
- `404`: Feedback entry not found or does not belong to the user.
- `500`: Server error.

**Response Body** (Success):
```json
{
  "status": "success",
  "feedback": {
    "_id": "mongo-object-id",
    "userId": "user-id",
    "historyId": "history-id",
    "feedbackType": "suggestion",
    "correctLabel": "Healthy",
    "comments": "Updated: Model could use more context for identification.",
    "createdAt": "2025-06-08T18:53:00.000Z",
    "updatedAt": "2025-06-08T19:00:00.000Z"
  }
}
```

**Response Body** (Error):
```json
{
  "status": "error",
  "message": "Feedback not found"
}
```

**Notes**:
- Only the authenticated user who created the feedback can update it.
- Updates are applied to the specified fields (`feedbackType`, `correctLabel`, `comments`), leaving unspecified fields unchanged.
- The `historyId` is typically not updated but can be included in the request body if needed.

## Notes
- All endpoints require authentication via a valid JWT token, ensuring only registered users can submit or manage feedback.
- Feedback is linked to classification history entries (`History` model) via `historyId`.
- The `ModelFeedback` model stores feedback data, including the user ID, feedback type, correct label, and optional comments.
- Duplicate feedback submissions for the same history entry by the same user are prevented.