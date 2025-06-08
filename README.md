# Pestector NodeJS Backend

Welcome to the **Pestector NodeJS Backend**, a powerful backend for the Pestector application, built using Node.js and Express. Pestector is a plant disease detection platform leveraging **VGG-16** and **Vision Transformer (ViT)** models, trained on the New Plant Diseases Dataset from Kaggle. This backend handles user authentication, profile management, plant disease classification, analytics, and more, with MongoDB as the database and integrations for geolocation, email services, and real-time notifications.

## Table of Contents

- Project Overview
- About the Dataset
- Features
- Installation
- Configuration
- API Routes
- Dependencies
- Contributing
- License

## Project Overview

Pestector is a comprehensive platform for detecting plant diseases using advanced deep learning models (VGG-16 and ViT). It provides users with tools to upload images of plant leaves, classify diseases, receive treatment recommendations, and access community forums. The backend supports secure user authentication, two-factor authentication (2FA), geolocation-based services, and subscription management. It also includes features for guest users, real-time chat, weather integration, and analytics for both users and admins.

## About the Dataset

The New Plant Diseases Dataset is used to train the VGG-16 and ViT models for plant disease detection. Key details:

- **Source**: Recreated using offline augmentation from the original dataset (available on GitHub).
- **Content**: Approximately 87,000 RGB images of healthy and diseased crop leaves, categorized into 38 classes.
- **Structure**: Split into 80% training and 20% validation sets, preserving directory structure.
- **Test Set**: Includes a separate directory with 33 test images for prediction purposes.

The dataset powers the `/classify` endpoint, enabling accurate identification of plant diseases based on uploaded leaf images.

## Features

- **Plant Disease Detection**: Classify plant diseases using VGG-16 and ViT models via the `/classify` endpoint.
- **User Authentication**: Secure registration, login, logout, and 2FA with TOTP and QR code generation.
- **Geolocation**: Detect user location using coordinates or IP-based lookup for country-specific phone number formatting.
- **Profile Management**: Update user details, including profile images (JPEG, PNG, GIF, max 5MB).
- **Password Reset**: Secure password reset with email-based token verification and rate-limiting.
- **Guest Support**: Link guest session history to registered accounts.
- **Subscription Management**: Admin-controlled subscription plans with feature limits (e.g., scan limits, analytics).
- **Analytics**: User and admin analytics for scan history and platform usage.
- **Community Features**: Forums, real-time chat, and feedback submission.
- **Notifications & Reminders**: Real-time notifications and scheduled reminders for plant care.
- **Weather Integration**: Provide weather-based recommendations for plant treatment.
- **Reports**: Generate reports for admins on platform usage and user activity.

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/Abdelrahman968/pestector-nodeJS.git
   cd pestector-nodeJS
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up MongoDB**:

   - Ensure MongoDB is running locally or use a MongoDB Atlas connection string.
   - Configure the connection in the `config/config.js` file.

4. **Run the Application**:

   ```bash
   npm start
   ```

   The server runs on `http://localhost:3000` by default (or the port specified in your configuration).

## Configuration

Create a `.env` file in the root directory with the following environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/pestector

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_here

# API Keys for Geolocation
OPENCAGE_API_KEY=your_opencage_api_key
IPINFO_API_KEY=your_ipinfo_api_key

# Frontend URL for Password Reset Links
FRONTEND_URL=http://localhost:3000

# Email Service Configuration (e.g., for Nodemailer)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

Replace placeholders with your actual credentials.

## API Routes

All API routes are organized under specific modules. Below is a list of route files and their purposes, with links to detailed documentation:

| Route File | Base Path | Description | Documentation |
| --- | --- | --- | --- |
| `auth.js` | `/api/auth` | User authentication, 2FA, and profile management | Auth README |
| `adminSubscriptions.js` | `/api/admin/subscriptions` | Admin management of subscription plans | Admin Subscriptions README |
| `analytics.js` | `/api/analytics` | User and admin analytics for scans and platform usage | Analytics README |
| `chat.js` | `/api/chat` | Real-time chat functionality for users | Chat README |
| `classify.js` | `/api/classify` | Plant disease classification using VGG-16 and ViT | Classify README |
| `contact.js` | `/api/contact` | Handle user contact form submissions | Contact README |
| `feedback.js` | `/api/feedback` | Collect user feedback | Feedback README |
| `forum.js` | `/api/forum` | Community forums for discussions | Forum README |
| `guest.js` | `/api/guest` | Guest user functionality | Guest README |
| `general.js` | `/api/general` | General utility endpoints | General README |
| `history.js` | `/api/history` | User scan and activity history | History README |
| `index.js` | `/api` | Root API endpoint and health check | Index README |
| `notification.js` | `/api/notification` | Real-time notifications for users | Notification README |
| `plants.js` | `/api/plants` | Plant information and database | Plants README |
| `posts.js` | `/api/posts` | User-generated posts in forums | Posts README |
| `recommendation.js` | `/api/recommendation` | Treatment recommendations based on disease classification | Recommendation README |
| `reminders.js` | `/api/reminders` | Scheduled reminders for plant care | Reminders README |
| `reports.js` | `/api/reports` | Admin reports on platform usage | Reports README |
| `subscription.js` | `/api/subscription` | User subscription management | Subscription README |
| `treatment.js` | `/api/treatment` | Treatment plans for detected diseases | Treatment README |
| `weather.js` | `/api/weather` | Weather-based recommendations for plant care | Weather README |
|  |  |  |  |

**Note**: Detailed documentation for each route file is available in the `docs/` directory.

## Dependencies

- **express**: Web framework for Node.js.
- **bcryptjs**: Password hashing.
- **jsonwebtoken**: JWT-based authentication.
- **crypto**: Secure token generation.
- **express-rate-limit**: Rate limiting for sensitive endpoints.
- **axios**: HTTP client for geolocation and weather APIs.
- **speakeasy**: TOTP-based 2FA.
- **qrcode**: QR code generation for 2FA.
- **multer**: File upload handling for images.
- **mongoose**: MongoDB object modeling.
- **Additional Dependencies**: Check `package.json` for a complete list.

Run `npm install` to install all dependencies.

## Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make changes and commit (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request with a detailed description.

## License

This project is licensed under the MIT License. See the LICENSE file for details.