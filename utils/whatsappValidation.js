/**
 * WhatsApp Phone Number Validation Utility
 *
 * WhatsApp requirements:
 * - Must include country code (without leading zeros)
 * - No spaces, dashes, or parentheses
 * - No leading zeros in the local number (except for country codes that require it)
 * - Must be a valid phone number for the specified country
 */

// Install these dependencies:
// npm install libphonenumber-js

const { parsePhoneNumber, isValidPhoneNumber } = require("libphonenumber-js");

/**
 * Validates and formats phone numbers for WhatsApp use
 * @param {string} phoneNumber - Phone number input (can include spaces, dashes, etc.)
 * @param {string} [defaultCountry] - Default country code to use if not specified in number (ISO 3166-1 alpha-2)
 * @returns {object} Validation result with status and formatted number
 */
function validateWhatsAppNumber(phoneNumber, defaultCountry = null) {
  // Remove all non-numeric characters except the plus sign
  const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");

  try {
    // Try to parse the phone number
    const parsedNumber = parsePhoneNumber(cleanedNumber, defaultCountry);

    // Check if the number is valid
    if (!parsedNumber.isValid()) {
      return {
        isValid: false,
        error: "Invalid phone number",
        originalNumber: phoneNumber,
      };
    }

    // Get the country code and national number
    const countryCode = parsedNumber.countryCallingCode;
    const nationalNumber = parsedNumber.nationalNumber;

    // Format specifically for WhatsApp (country code + number, no spaces or symbols)
    const whatsappFormat = `+${countryCode}${nationalNumber}`;

    return {
      isValid: true,
      formattedNumber: whatsappFormat,
      originalNumber: phoneNumber,
      countryCode,
      nationalNumber,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      originalNumber: phoneNumber,
    };
  }
}

/**
 * Express middleware for WhatsApp number validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function whatsappValidationMiddleware(req, res, next) {
  const phoneField = req.body.phone || req.query.phone;
  const countryField = req.body.country || req.query.country;

  if (!phoneField) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const validation = validateWhatsAppNumber(phoneField, countryField);

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  // Add the validated number to the request object
  req.whatsappNumber = validation.formattedNumber;
  next();
}

// Example usage
module.exports = {
  validateWhatsAppNumber,
  whatsappValidationMiddleware,
};
