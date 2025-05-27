const path = require("path");
const express = require("express");
const router = express.Router();

const publicDir = path.join(__dirname, "public");

router.get("/", (req, res) => res.sendFile(path.join(publicDir, "index.html")));

router.get("/scan", (req, res) =>
  res.sendFile(path.join(publicDir, "scan.html"))
);

router.get("/plants", (req, res) =>
  res.sendFile(path.join(publicDir, "plants.html"))
);

router.get("/reminders", (req, res) =>
  res.sendFile(path.join(publicDir, "reminders.html"))
);

router.get("/treatment", (req, res) =>
  res.sendFile(path.join(publicDir, "treatment.html"))
);

router.get("/subscribe", (req, res) =>
  res.sendFile(path.join(publicDir, "subscribe.html"))
);
router.get("/weather", (req, res) =>
  res.sendFile(path.join(publicDir, "weather.html"))
);
router.get("/profile", (req, res) =>
  res.sendFile(path.join(publicDir, "profile.html"))
);
router.get("/forgot-password", (req, res) =>
  res.sendFile(path.join(publicDir, "forgot-password.html"))
);
router.get("/reset-password", (req, res) =>
  res.sendFile(path.join(publicDir, "reset-password.html"))
);

router.get("/library", (req, res) =>
  res.sendFile(path.join(publicDir, "disease-library.html"))
);
router.get("/about-us", (req, res) =>
  res.sendFile(path.join(publicDir, "about-us.html"))
);
router.get("/help", (req, res) =>
  res.sendFile(path.join(publicDir, "help.html"))
);
router.get("/terms", (req, res) =>
  res.sendFile(path.join(publicDir, "terms.html"))
);
router.get("/official-rules", (req, res) =>
  res.sendFile(path.join(publicDir, "official-rules.html"))
);
router.get("/donate", (req, res) =>
  res.sendFile(path.join(publicDir, "donate.html"))
);
router.get("/advertisement", (req, res) =>
  res.sendFile(path.join(publicDir, "advertisement.html"))
);
router.get("/dmca", (req, res) =>
  res.sendFile(path.join(publicDir, "dmca.html"))
);
router.get("/adding-files", (req, res) =>
  res.sendFile(path.join(publicDir, "adding-files.html"))
);
router.get("/privacy-policy", (req, res) =>
  res.sendFile(path.join(publicDir, "privacy-policy.html"))
);
router.get("/contact", (req, res) =>
  res.sendFile(path.join(publicDir, "contact.html"))
);
router.get("/login", (req, res) =>
  res.sendFile(path.join(publicDir, "login.html"))
);
router.get("/register", (req, res) =>
  res.sendFile(path.join(publicDir, "register.html"))
);
router.get("/history", (req, res) =>
  res.sendFile(path.join(publicDir, "history.html"))
);
router.get("/dashboard", (req, res) =>
  res.sendFile(path.join(publicDir, "dashboard.html"))
);
router.get("/recommendation", (req, res) =>
  res.sendFile(path.join(publicDir, "recommendation.html"))
);

module.exports = router;
