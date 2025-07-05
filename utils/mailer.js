const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to determine if URL is localhost
const isLocalhost = (url) => {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0")
  );
};

// Helper function to get app URL for production vs development
const getAppUrl = (resetUrl) => {
  if (isLocalhost(resetUrl)) {
    return "http://localhost:3000"; // Adjust port as needed
  }
  return process.env.FRONTEND_URL || "##"; // Your production URL
};

const sendPasswordResetEmail = async (toEmail, username, resetUrl) => {
  const appUrl = getAppUrl(resetUrl);
  const logoUrl = `${appUrl}/images/logo.png`; // Adjust path to your logo

  // Enhanced HTML template with professional styling
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Pestector Password</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #555555;
            line-height: 1.8;
        }
        
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            transition: transform 0.2s ease;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }
        
        .alternative-link {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #6c757d;
        }
        
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            margin: 5px 0;
            color: #6c757d;
            font-size: 14px;
        }
        
        .security-tips {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
        
        .security-tips h3 {
            margin-bottom: 10px;
            font-size: 16px;
            color: #0c5460;
        }
        
        .security-tips ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .security-tips li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .content, .header, .footer {
                padding: 20px;
            }
            
            .reset-button {
                display: block;
                text-align: center;
                margin: 20px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                🛡️
            </div>
            <h1>Pestector Security</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hello ${username},</div>
            
            <div class="message">
                We received a request to reset your password for your Pestector account. 
                If you made this request, please click the button below to create a new password.
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            </div>
            
            <div class="message">
                If the button above doesn't work, copy and paste this link into your browser:
            </div>
            
            <div class="alternative-link">
                ${resetUrl}
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This password reset link will expire in 60 minutes for security reasons.
                If you didn't request this password reset, please ignore this email - your account remains secure.
            </div>
            
            <div class="security-tips">
                <h3>🔒 Security Tips:</h3>
                <ul>
                    <li>Never share your password with anyone</li>
                    <li>Use a unique, strong password for your Pestector account</li>
                    <li>Enable two-factor authentication if available</li>
                    <li>Log out of shared or public computers</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Pestector Security Team</strong></p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>If you need help, contact our support team.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} Pestector. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

  // Enhanced plain text version
  const textTemplate = `
🛡️ PESTECTOR SECURITY - PASSWORD RESET

Hello ${username},

We received a request to reset your password for your Pestector account.

RESET LINK:
${resetUrl}

⚠️ IMPORTANT SECURITY INFORMATION:
• This link will expire in 60 minutes
• If you didn't request this reset, please ignore this email
• Your account remains secure if you ignore this message

🔒 SECURITY TIPS:
• Never share your password with anyone
• Use a unique, strong password 
• Enable two-factor authentication if available
• Always log out of shared computers

---
Pestector Security Team
This is an automated message - please do not reply.

Need help? Contact our support team.
© ${new Date().getFullYear()} Pestector. All rights reserved.
`;

  const mailOptions = {
    from: {
      name: "Pestector Security",
      address: process.env.EMAIL_USER,
    },
    to: toEmail,
    subject: `🔒 Reset Your Pestector Password - Action Required`,
    text: textTemplate,
    html: htmlTemplate,
    // Add email headers for better deliverability
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to ${toEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);

    // Log different message for localhost vs production
    if (isLocalhost(resetUrl)) {
      console.log(`🔧 Development mode: Reset URL contains localhost`);
    } else {
      console.log(`🌐 Production mode: Reset URL is external`);
    }

    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
      isLocalhost: isLocalhost(resetUrl),
    };
  } catch (error) {
    console.error(
      `❌ Error sending password reset email to ${toEmail}:`,
      error
    );

    // Enhanced error handling
    const errorResponse = {
      success: false,
      error: error.message,
      recipient: toEmail,
      timestamp: new Date().toISOString(),
    };

    // Log specific error types
    if (error.code === "EAUTH") {
      console.error("🚫 Authentication failed - check email credentials");
    } else if (error.code === "ECONNECTION") {
      console.error("🌐 Connection failed - check internet connection");
    } else if (error.code === "EMESSAGE") {
      console.error("📧 Message rejected - check email content and recipient");
    }

    throw errorResponse;
  }
};

// Password change confirmation email
const sendPasswordChangeConfirmation = async (
  toEmail,
  username,
  changeTime = new Date()
) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const formattedTime = changeTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const confirmationHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .success-message {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        
        .success-message h2 {
            color: #155724;
            font-size: 20px;
            margin-bottom: 10px;
        }
        
        .success-message p {
            color: #155724;
            font-size: 16px;
        }
        
        .details-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .details-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .details-row:last-child {
            border-bottom: none;
        }
        
        .details-label {
            font-weight: 600;
            color: #495057;
        }
        
        .details-value {
            color: #6c757d;
            text-align: right;
        }
        
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .security-notice h3 {
            color: #856404;
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        .security-notice p {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            margin: 10px 0;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            margin: 5px 0;
            color: #6c757d;
            font-size: 14px;
        }
        
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .content, .header, .footer {
                padding: 20px;
            }
            
            .details-row {
                flex-direction: column;
                text-align: left;
            }
            
            .details-value {
                text-align: left;
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">✅</div>
            <h1>Password Changed Successfully</h1>
        </div>
        
        <div class="content">
            <div class="success-message">
                <h2>🔒 Your Password Has Been Updated</h2>
                <p>Hello ${username}, your Pestector account password was successfully changed.</p>
            </div>
            
            <div class="details-box">
                <h3 style="margin-bottom: 15px; color: #495057;">Change Details:</h3>
                <div class="details-row">
                    <span class="details-label">Account:</span>
                    <span class="details-value">${username}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Email:</span>
                    <span class="details-value">${toEmail}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Date & Time:</span>
                    <span class="details-value">${formattedTime}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">IP Address:</span>
                    <span class="details-value">Hidden for security</span>
                </div>
            </div>
            
            <div class="security-notice">
                <h3>🚨 Didn't Change Your Password?</h3>
                <p><strong>If you did not make this change:</strong></p>
                <p>• Your account may have been compromised</p>
                <p>• Contact our support team immediately</p>
                <p>• Consider enabling two-factor authentication</p>
                <p>• Review your recent account activity</p>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${appUrl}/contact" class="action-button">🆘 Contact Support</a>
                    <a href="${appUrl}/privacy-policy" class="action-button" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); margin-left: 10px;">🔐 Privacy Policy</a>
                </div>
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0c5460; margin-bottom: 15px;">🛡️ Security Tips:</h3>
                <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                    <li style="margin: 8px 0;">Use a unique, strong password for your Pestector account</li>
                    <li style="margin: 8px 0;">Enable two-factor authentication for extra security</li>
                    <li style="margin: 8px 0;">Never share your login credentials with anyone</li>
                    <li style="margin: 8px 0;">Log out completely when using shared computers</li>
                    <li style="margin: 8px 0;">Regularly monitor your account for suspicious activity</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Pestector Security Team</strong></p>
            <p>This is an automated security notification.</p>
            <p>If you have questions, please contact our support team.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} Pestector. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

  const textTemplate = `
✅ PESTECTOR - PASSWORD CHANGED SUCCESSFULLY

Hello ${username},

Your Pestector account password was successfully changed.

CHANGE DETAILS:
• Account: ${username}
• Email: ${toEmail}
• Date & Time: ${formattedTime}

🚨 DIDN'T CHANGE YOUR PASSWORD?
If you did not make this change, your account may be compromised.

IMMEDIATE ACTIONS:
• Contact our support team immediately
• Enable two-factor authentication
• Review your recent account activity

🛡️ SECURITY TIPS:
• Use unique, strong passwords
• Enable two-factor authentication
• Never share login credentials
• Log out of shared computers
• Monitor account activity regularly

---
Pestector Security Team
This is an automated security notification.

Contact Support: ${appUrl}/contact-support
Security Settings: ${appUrl}/account/security

© ${new Date().getFullYear()} Pestector. All rights reserved.
`;

  const mailOptions = {
    from: {
      name: "Pestector Security",
      address: process.env.EMAIL_USER,
    },
    to: toEmail,
    subject: `✅ Password Changed Successfully - ${username}`,
    text: textTemplate,
    html: confirmationHtml,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password change confirmation sent to ${toEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
      timestamp: changeTime,
    };
  } catch (error) {
    console.error(
      `❌ Error sending password change confirmation to ${toEmail}:`,
      error
    );

    const errorResponse = {
      success: false,
      error: error.message,
      recipient: toEmail,
      timestamp: new Date().toISOString(),
    };

    throw errorResponse;
  }
};

// Additional helper function for sending welcome emails
const sendWelcomeEmail = async (toEmail, username) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const welcomeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Pestector</title>
    <style>
        /* Reuse the same styles as above */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
        .logo { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; }
        .content { padding: 40px 30px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎉</div>
            <h1>Welcome to Pestector!</h1>
        </div>
        <div class="content">
            <h2>Hello ${username}!</h2>
            <p>Welcome to Pestector! We're excited to have you on board.</p>
            <p>Your account has been successfully created and you can now start using all our security features.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Get Started</a>
            </div>
        </div>
        <div class="footer">
            <p><strong>Pestector Team</strong></p>
            <p>Thank you for choosing Pestector for your security needs.</p>
        </div>
    </div>
</body>
</html>`;

  const mailOptions = {
    from: { name: "Pestector Team", address: process.env.EMAIL_USER },
    to: toEmail,
    subject: "🎉 Welcome to Pestector - Get Started!",
    html: welcomeHtml,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
  sendWelcomeEmail,
  isLocalhost,
};
