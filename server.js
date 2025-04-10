const app = require("./app");
const { PORT, PYTHON_API_URL } = require("./config/config");
const fetch = require("node-fetch");

app.listen(PORT, async () => {
  console.log(`Node.js server running on port ${PORT}`);
  console.log(`Proxying requests to Python server at ${PYTHON_API_URL}`);

  try {
    const response = await fetch(`${PYTHON_API_URL}/health-check`);
    const text = await response.text();
    if (response.ok) {
      console.log("Successfully connected to Python server!");
    } else {
      console.log(
        `Python server responded with an error. Status: ${response.status}, Message: ${text}`
      );
    }
  } catch (error) {
    console.log("Failed to connect to Python server:", error.message);
  }
});
