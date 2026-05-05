const express = require('express');
const logger = require('./logging_middleware/logger');

const schedulerRoutes = require('./vehicle_maintenance_scheduler/scheduler.routes');
const notificationRoutes = require('./notification_app_be/notification.routes');

const app = express();

app.use(express.json());
app.use(logger);

app.use('/api/scheduler', schedulerRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

module.exports = app;  