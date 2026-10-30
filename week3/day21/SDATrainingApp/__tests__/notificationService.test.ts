jest.mock('react-native-notify-kit', () => {
  return {
    __esModule: true,
    default: {
      requestPermission: jest.fn().mockResolvedValue(1),
      createChannel: jest.fn().mockResolvedValue('day21-updates'),
      displayNotification: jest.fn().mockResolvedValue(undefined),
      handleFcmMessage: jest.fn().mockResolvedValue(undefined),
    },
    AndroidImportance: {
      DEFAULT: 3,
    },
  };
});

import notifee from 'react-native-notify-kit';
import { notificationService } from '../src/services/notificationService';

const mockNotifee = notifee as unknown as {
  requestPermission: jest.Mock;
  createChannel: jest.Mock;
  displayNotification: jest.Mock;
  handleFcmMessage: jest.Mock;
};

describe('Day 21 notification service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests permission and displays a local notification', async () => {
    await notificationService.showLocalNotification(
      'Sync completed',
      'Your offline data has been synchronized.',
    );

    expect(mockNotifee.requestPermission).toHaveBeenCalled();

    expect(mockNotifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'day21-updates',
        name: 'Day 21 Updates',
      }),
    );

    expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sync completed',
        body: 'Your offline data has been synchronized.',
      }),
    );
  });

  it('passes remote FCM messages to NotifyKit', async () => {
    const message = {
      data: {
        title: 'New update',
        body: 'Your analytics have changed.',
      },
    };

    await notificationService.handleRemoteMessage(message);

    expect(mockNotifee.handleFcmMessage).toHaveBeenCalledWith(message);
  });
});