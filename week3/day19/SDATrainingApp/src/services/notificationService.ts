import notifee, {
  AndroidImportance,
} from 'react-native-notify-kit';

const CHANNEL_ID = 'day19-updates';

class NotificationService {
  async showLocalNotification(
    title: string,
    body: string,
  ): Promise<void> {
    await notifee.requestPermission();

    const channelId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Day 19 Updates',
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
    });
  }
}

export const notificationService = new NotificationService();