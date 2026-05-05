const express = require("express");
const loggingMiddleware = require("./logging_middleware/logger");
const { scheduleVehiclesHandler } = require("./vehicle_scheduling/scheduler");
const {
  priorityInboxHandler,
  priorityInboxBatchHandler,
  getPriorityStatsHandler,
} = require("./priority_proxy");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(loggingMiddleware);

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

app.post("/api/schedule/vehicles", scheduleVehiclesHandler);

app.post("/api/schedule/optimize", (req, res) => {
  try {
    const { depot_hours, vehicles } = req.body;

    if (!depot_hours || !vehicles) {
      return res.status(400).json({
        error: "Missing required fields: depot_hours and vehicles",
        example: {
          depot_hours: 40,
          vehicles: [
            {
              taskId: "TASK001",
              duration: 8,
              impact: 100,
            },
          ],
        },
      });
    }

    scheduleVehiclesHandler(req, res);
  } catch (error) {
    res.status(500).json({
      error: "Error processing vehicle scheduling: " + error.message,
    });
  }
});

app.get("/api/priority-inbox/:studentId", priorityInboxHandler);

app.post("/api/priority-inbox/batch", priorityInboxBatchHandler);

app.get("/api/priority-inbox/stats/weights", getPriorityStatsHandler);

app.get("/api/docs", (req, res) => {
  try {
    res.status(200).json({
      service: "AffordMed Backend Evaluation",
      version: "1.0.0",
      endpoints: {
        health: {
          method: "GET",
          path: "/health",
          description: "Service health check",
        },
        vehicleScheduling: {
          optimize: {
            method: "POST",
            path: "/api/schedule/vehicles",
            description:
              "Optimize vehicle maintenance schedule using Knapsack algorithm",
            bodyExample: {
              depot_hours: 40,
              vehicles: [
                {
                  taskId: "TASK001",
                  duration: 8,
                  impact: 100,
                },
                {
                  taskId: "TASK002",
                  duration: 6,
                  impact: 80,
                },
              ],
            },
          },
        },
        priorityInbox: {
          fetchSingle: {
            method: "GET",
            path: "/api/priority-inbox/:studentId",
            description:
              "Fetch top 10 priority-sorted notifications for a student",
          },
          fetchBatch: {
            method: "POST",
            path: "/api/priority-inbox/batch",
            description:
              "Fetch priority-sorted notifications for multiple students",
            bodyExample: {
              studentIds: [1042, 1043, 1044],
            },
          },
          priorityWeights: {
            method: "GET",
            path: "/api/priority-inbox/stats/weights",
            description: "Get priority weight definitions",
          },
        },
      },
      stages: {
        stage0: "Vehicle Maintenance Scheduler (Knapsack Algorithm)",
        stage1: "REST API Design for Notification System",
        stage2: "Database Schema Design (PostgreSQL)",
        stage3: "SQL Optimization and Indexing",
        stage4: "Scaling Strategy (Redis Caching)",
        stage5: "Background Processing (Message Queue)",
        stage6: "Priority Inbox Logic",
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching documentation: " + error.message,
    });
  }
});

app.use((err, req, res, next) => {
  try {
    console.error("Error:", {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
      path: req.path,
      method: req.method,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Fatal error in error handler",
    });
  }
});

app.use((req, res) => {
  try {
    res.status(404).json({
      error: "Endpoint not found",
      path: req.path,
      method: req.method,
      availableEndpoints: "/api/docs",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error processing request",
    });
  }
});

module.exports = app;  