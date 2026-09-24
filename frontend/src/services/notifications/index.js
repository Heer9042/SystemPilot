let sendNotificationFn = null;

export const notificationService = {
  async notify(title, body) {
    try {
      if (!sendNotificationFn) {
        const notif = await import('@tauri-apps/plugin-notification');
        sendNotificationFn = notif.sendNotification;
      }
      sendNotificationFn({ title, body });
    } catch {
      // Ignored if notifications plugin is not active
    }
  },
};

export default notificationService;
