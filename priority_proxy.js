const notificationService = require('../notification_app_be/notification.service');

function priorityInboxHandler(req, res) {
  try {
    const { studentId } = req.params;

    // Get all notifications for the student
    const allNotifications = notificationService.getNotifications();
    const studentNotifications = allNotifications.filter(n => n.student_id == studentId);

    // Sort by priority (assuming higher impact or newer first, but since no priority field, sort by createdAt desc)
    const sortedNotifications = studentNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Take top 10
    const top10 = sortedNotifications.slice(0, 10);

    res.status(200).json({
      studentId,
      notifications: top10,
      total: studentNotifications.length,
      returned: top10.length
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching priority inbox: " + error.message,
    });
  }
}

function priorityInboxBatchHandler(req, res) {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({
        error: "studentIds must be an array",
      });
    }

    const results = {};
    const allNotifications = notificationService.getNotifications();

    studentIds.forEach(studentId => {
      const studentNotifications = allNotifications.filter(n => n.student_id == studentId);
      const sortedNotifications = studentNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      results[studentId] = sortedNotifications.slice(0, 10);
    });

    res.status(200).json({
      results,
      requested: studentIds.length
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching priority inbox batch: " + error.message,
    });
  }
}

function getPriorityStatsHandler(req, res) {
  try {
    // Dummy priority weights
    const priorityWeights = {
      urgent: 100,
      important: 80,
      normal: 50,
      low: 20
    };

    res.status(200).json({
      priorityWeights,
      description: "Priority weights for notification sorting"
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching priority stats: " + error.message,
    });
  }
}

module.exports = {
  priorityInboxHandler,
  priorityInboxBatchHandler,
  getPriorityStatsHandler,
};