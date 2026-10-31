import notifee, {
  AndroidImportance,
} from 'react-native-notify-kit';

const CHANNEL_ID = 'day21-updates';

interface FcmHandler {
  handleFcmMessage?: (message: unknown) => Promise<void>;
}

// The package's documented FCM method is forwarded through this
// adapter so the application does not need to duplicate its internals.
const fcmHandler = notifee as unknown as FcmHandler;

class NotificationService {
  async requestPermissions(): Promise<void> {
    await notifee.requestPermission();
  }

  async initialize(): Promise<void> {
    await this.requestPermissions();

    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Day 21 Updates',
      importance: AndroidImportance.DEFAULT,
    });
  }

  async showLocalNotification(
    title: string,
    body: string,
  ): Promise<void> {
    await this.initialize();

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        pressAction: {
          id: 'default',
        },
      },
    });
  }

  async handleRemoteMessage(message: unknown): Promise<void> {
    await this.initialize();

    if (!fcmHandler.handleFcmMessage) {
      throw new Error(
        'FCM message handling is not available in this notification package.',
      );
    }

    await fcmHandler.handleFcmMessage(message);
  }
}

export const notificationService = new NotificationService();