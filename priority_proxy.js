const axios = require("axios");

const PRIORITY_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

/**

 * @param {string} studentId
 * @returns {Promise<Array>}
 */
async function fetchAndPrioritizeNotifications(studentId) {
  try {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    const authToken = process.env.AUTH_TOKEN || "default-token";

    const response = await axios.get(
      "http://20.207.122.201/evaluation-service/notifications",
      {
        params: {
          studentId: studentId,
        },
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid response format from notifications service");
    }

    const notifications = response.data;

    const prioritizedNotifications = notifications
      .map((notification) => {
        if (!notification.type || !notification.timestamp) {
          return null;
        }

        const weight = PRIORITY_WEIGHTS[notification.type] || 0;

        return {
          ...notification,
          weight: weight,
          sortKey: {
            weight: weight,
            timestamp: new Date(notification.timestamp).getTime(),
          },
        };
      })
      .filter((n) => n !== null)
      .sort((a, b) => {
        if (a.sortKey.weight !== b.sortKey.weight) {
          return b.sortKey.weight - a.sortKey.weight;
        }

        return b.sortKey.timestamp - a.sortKey.timestamp;
      })
      .slice(0, 10)
      .map(({ sortKey, ...notification }) => notification);
    return {
      success: true,
      count: prioritizedNotifications.length,
      notifications: prioritizedNotifications,
      metadata: {
        totalRetrieved: notifications.length,
        studentId: studentId,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        error: `Service error: ${error.response.status} - ${error.response.statusText}`,
        count: 0,
        notifications: [],
        metadata: {
          studentId: studentId,
          timestamp: new Date().toISOString(),
        },
      };
    } else if (error.request) {
      return {
        success: false,
        error: "Failed to reach notifications service. Please try again.",
        count: 0,
        notifications: [],
        metadata: {
          studentId: studentId,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: false,
        error: "Error processing request: " + error.message,
        count: 0,
        notifications: [],
        metadata: {
          studentId: studentId,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

async function priorityInboxHandler(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid student ID format",
      });
    }

    const result = await fetchAndPrioritizeNotifications(studentId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(503).json(result);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error: " + error.message,
      count: 0,
      notifications: [],
    });
  }
}

async function priorityInboxBatchHandler(req, res) {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "studentIds must be a non-empty array",
      });
    }

    const promises = studentIds.map((id) =>
      fetchAndPrioritizeNotifications(id).catch((error) => ({
        success: false,
        error: error.message,
        studentId: id,
        notifications: [],
      })),
    );

    const results = await Promise.all(promises);

    return res.status(200).json({
      success: true,
      data: results,
      totalStudents: studentIds.length,
      successfulFetches: results.filter((r) => r.success).length,
      failedFetches: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error processing batch request: " + error.message,
    });
  }
}

async function getPriorityStatsHandler(req, res) {
  try {
    return res.status(200).json({
      success: true,
      priorityWeights: PRIORITY_WEIGHTS,
      description: {
        Placement: {
          weight: 3,
          description: "Highest priority - placement-related notifications",
        },
        Result: {
          weight: 2,
          description: "Medium priority - academic results and scores",
        },
        Event: {
          weight: 1,
          description: "Low priority - general events and announcements",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error fetching priority statistics: " + error.message,
    });
  }
}

module.exports = {
  fetchAndPrioritizeNotifications,
  priorityInboxHandler,
  priorityInboxBatchHandler,
  getPriorityStatsHandler,
  PRIORITY_WEIGHTS,
};