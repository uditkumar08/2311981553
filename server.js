require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  try {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
  } catch (error) {
    console.error("Error starting server:", error.message);
    process.exit(1);
  }
});

process.on("SIGTERM", () => {
  try {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during graceful shutdown:", error.message);
    process.exit(1);
  }
});

process.on("SIGINT", () => {
  try {
    console.log("SIGINT received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during graceful shutdown:", error.message);
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  try {
    console.error("Uncaught Exception:", error.message);
    process.exit(1);
  } catch (err) {
    console.error("Fatal error in uncaught exception handler");
    process.exit(1);
  }
});