const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class NotificationService extends EventEmitter {
  constructor() {
    super();

    this.notifications = new Map();
  }

  async initialize() {
    console.log('NotificationService initialized');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('notification:created', (notification) => {
      console.log(
        `Notification created: ${notification.id}`
      );
    });
  }

  async createNotification(notificationData) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
      } = notificationData;

      if (!userId || !type || !title || !message) {
        throw new Error(
          'User ID, type, title, and message are required'
        );
      }

      const notification = {
        id: uuidv4(),
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date(),
      };

      if (!this.notifications.has(userId)) {
        this.notifications.set(userId, []);
      }

      this.notifications
        .get(userId)
        .push(notification);

      this.emit(
        'notification:created',
        notification
      );

      return notification;
    } catch (error) {
      console.error(
        'Error creating notification:',
        error
      );

      throw error;
    }
  }

  async getUserNotifications(
    userId,
    filters = {}
  ) {
    let notifications =
      this.notifications.get(userId) || [];

    if (filters.isRead !== undefined) {
      notifications = notifications.filter(
        (notification) =>
          notification.isRead === filters.isRead
      );
    }

    const page =
      parseInt(filters.page, 10) || 1;

    const limit =
      parseInt(filters.limit, 10) || 10;

    const skip = (page - 1) * limit;

    const total = notifications.length;

    const paginatedNotifications =
      notifications
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        )
        .slice(skip, skip + limit);

    return {
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(
    userId,
    notificationId
  ) {
    const notifications =
      this.notifications.get(userId) || [];

    const notification =
      notifications.find(
        (item) => item.id === notificationId
      );

    if (!notification) {
      throw new Error(
        'Notification not found'
      );
    }

    notification.isRead = true;

    return notification;
  }

  async markAllAsRead(userId) {
    const notifications =
      this.notifications.get(userId) || [];

    notifications.forEach(
      (notification) => {
        notification.isRead = true;
      }
    );

    return {
      message:
        'All notifications marked as read',
    };
  }

  async deleteNotification(
    userId,
    notificationId
  ) {
    const notifications =
      this.notifications.get(userId) || [];

    const notificationIndex =
      notifications.findIndex(
        (item) => item.id === notificationId
      );

    if (notificationIndex === -1) {
      throw new Error(
        'Notification not found'
      );
    }

    notifications.splice(
      notificationIndex,
      1
    );

    return {
      message:
        'Notification deleted successfully',
    };
  }
}

module.exports =
  new NotificationService();