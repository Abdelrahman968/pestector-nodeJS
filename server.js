const app = require("./app");
const { PORT, PYTHON_API_URL } = require("./config/config");
const fetch = require("node-fetch");
const Models = require("./models");

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const updateOldImageUrls = async () => {
  console.log("Starting update of old image URLs...");
  const items = await Models.History.find({});

  for (let item of items) {
    if (
      item.imageUrl &&
      (item.imageUrl.startsWith("http://localhost:3000") ||
        item.imageUrl.startsWith("http://127.0.0.1:3000"))
    ) {
      let newUrl = item.imageUrl
        .replace("http://localhost:3000", APP_URL)
        .replace("http://127.0.0.1:3000", APP_URL);

      item.imageUrl = newUrl;
      await item.save();
      console.log(`Updated image URL for item ${item._id}`);
    }
  }
  console.log("Update complete.");
};

app.listen(PORT, async () => {
  console.log(`Node.js server running on port ${PORT}`);

  try {
    await updateOldImageUrls();

    const response = await fetch(`${PYTHON_API_URL}/health-check`);
    const text = await response.text();
    if (response.ok) {
      console.log("Successfully connected to Python server!");
    } else {
      console.log(
        `Python server responded with an error. Status: ${response.status}, Message: ${text}`,
      );
    }
  } catch (error) {
    console.log("Error during server startup:", error.message);
  }
});
