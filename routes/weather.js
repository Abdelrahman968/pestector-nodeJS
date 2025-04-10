const express = require("express");
const axios = require("axios");
const authenticateToken = require("../middleware/auth");
const { WEATHER_API_KEY } = require("../config/config");

const router = express.Router();

router.get("/weather-recommendations", authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        status: "error",
        message: "Latitude and longitude are required",
      });
    }

    console.log("Fetching weather for:", { lat, lng }); // Debug
    const weatherResponse = await axios.get(
      "https://api.weatherapi.com/v1/forecast.json",
      {
        params: {
          key: "9a81bdfca8ec402aa09233147251403",
          q: `${lat},${lng}`,
          days: 5,
          aqi: "no",
          alerts: "no",
        },
      }
    );

    const weather = weatherResponse.data;
    console.log("WeatherAPI Response:", weather); // Debug

    if (
      !weather.current ||
      !weather.forecast ||
      !weather.forecast.forecastday
    ) {
      throw new Error("Invalid WeatherAPI response structure");
    }

    const recommendations = [];
    const currentTemp = weather.current.temp_c || 0;

    if (currentTemp > 30) {
      recommendations.push(
        "High temperature alert! Water your plants more frequently, preferably in early morning or evening.",
        "Consider moving sensitive potted plants to shade.",
        "Add mulch to reduce water evaporation."
      );
    } else if (currentTemp < 5) {
      recommendations.push(
        "Cold temperature alert! Protect sensitive plants from frost.",
        "Reduce watering as plants need less water in colder weather.",
        "Consider bringing potted plants indoors or using frost covers."
      );
    }

    const rainForecast = weather.forecast.forecastday.some(
      (day) => (day.day.daily_chance_of_rain || 0) > 50
    );
    if (rainForecast) {
      recommendations.push(
        "Rain expected in the coming days. Adjust your watering schedule accordingly.",
        "Check drainage for potted plants to prevent waterlogging.",
        "Avoid applying fertilizers before the rain."
      );
    }

    res.json({
      status: "success",
      weather: {
        current: {
          temp: weather.current.temp_c || 0,
          humidity: weather.current.humidity || 0,
          condition: weather.current.condition?.text || "Unknown",
          icon: weather.current.condition?.icon || "",
        },
        forecast: weather.forecast.forecastday.slice(0, 5),
      },
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching weather data:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      axiosError: error.isAxiosError,
    });
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching weather data",
    });
  }
});

module.exports = router;
