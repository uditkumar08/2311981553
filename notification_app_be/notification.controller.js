const service = require('./notification.service');

exports.create = (req, res) => {
  const notif = service.createNotification(req.body);
  res.status(201).json(notif);
};

exports.getAll = (req, res) => {
  res.json(service.getNotifications());
};

exports.markRead = (req, res) => {
  const notif = service.markAsRead(req.params.id);

  if (!notif) {
    return res.status(404).json({ message: 'Not found' });
  }

  res.json(notif);
};