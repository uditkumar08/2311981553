let notifications = [];

exports.createNotification = (data) => {
  const newNotification = {
    id: Date.now().toString(),
    student_id: data.student_id || "unknown",
    type: data.type,
    message: data.message,
    isRead: false,
    createdAt: new Date()
  };

  notifications.push(newNotification);
  return newNotification;
};



exports.getNotifications = () => {
  return notifications;
};

exports.markAsRead = (id) => {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.isRead = true;
  return notif;
};