# Contact API Documentation

This document describes the contact-related API endpoint for the Pestector application, implemented in `contact.js`. The endpoint handles submissions from a contact form, saving the data to MongoDB and sending an email notification to a designated recipient. The endpoint is accessible at the base URL: `/api/contact`.

## Table of Contents
- [POST /](#post-)

## POST /
**Description**: Processes a contact form submission by saving the user's input to the MongoDB `Contact` collection and sending an email notification to `se.abdelrahman968@gmail.com` using Nodemailer with Gmail as the email service.

**Request Body**:
- `name` (string, required): The name of the user submitting the form.
- `email` (string, required): The user's email address.
- `subject` (string, required): The subject of the message.
- `message` (string, required): The content of the message.

**Responses**:
- `200`: Message successfully saved and email sent.
- `400`: Missing required fields (name, email, subject, or message).
- `500`: Server error or failure to process the request.

**Response Body** (Success):
```json
{
  "status": "success",
  "message": "Message received successfully"
}
```

**Response Body** (Error):
```json
{
  "status": "error",
  "message": "All fields (name, email, subject, message) are required"
}
```

**Notes**:
- The endpoint validates that all required fields (`name`, `email`, `subject`, `message`) are provided.
- The submission is saved to the MongoDB `Contact` collection with the provided details.
- An email is sent to `se.abdelrahman968@gmail.com` with the form details, using the authenticated Gmail account specified in `process.env.EMAIL_USER` and `process.env.EMAIL_PASS`.
- The email includes both plain text and HTML formats, with the user's email set as the `replyTo` address for easy follow-up.
- Errors during MongoDB save or email sending are logged to the console with stack traces for debugging.

## Configuration
Ensure the following environment variables are set in your `.env` file:
```env
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
```
- `EMAIL_USER`: The Gmail address used to send emails.
- `EMAIL_PASS`: An app-specific password for Gmail (generate this in your Google Account settings for security).

## Notes
- The endpoint does not require authentication, making it accessible to all users.
- The email recipient is hardcoded to `se.abdelrahman968@gmail.com`.
- Nodemailer uses Gmail as the email service; ensure the Gmail account has "Less secure app access" enabled or use an app-specific password for security.
- The `Contact` model in MongoDB stores the form data for future reference.