function formatDateTo12Hour(timeString) {
  const date = new Date(timeString);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  };

  return date.toLocaleString("en-US", options);
}

module.exports = formatDateTo12Hour;
