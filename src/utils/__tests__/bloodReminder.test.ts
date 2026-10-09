import * as Notifications from 'expo-notifications';
import { scheduleRechargedReminder, cancelRechargedReminder, BLOOD_RECHARGE_NOTIFICATION_ID } from '../bloodReminder';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-123'),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

describe('bloodReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancelRechargedReminder cancels the notification identifier', async () => {
    await cancelRechargedReminder();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BLOOD_RECHARGE_NOTIFICATION_ID);
  });

  it('cancels any prior reminder before scheduling a new one', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await scheduleRechargedReminder(today, 'male');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BLOOD_RECHARGE_NOTIFICATION_ID);
  });

  it('schedules a 90-day notification for male donors', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await scheduleRechargedReminder(today, 'male');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(callArgs.identifier).toBe(BLOOD_RECHARGE_NOTIFICATION_ID);
    // ~90 days in seconds = 90 * 86400 = 7,776,000
    expect(callArgs.trigger.seconds).toBeGreaterThan(89 * 86400);
    expect(callArgs.trigger.seconds).toBeLessThanOrEqual(90 * 86400);
  });

  it('schedules a 120-day notification for female donors (WHO guideline)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await scheduleRechargedReminder(today, 'female');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    // ~120 days in seconds = 120 * 86400 = 10,368,000
    expect(callArgs.trigger.seconds).toBeGreaterThan(119 * 86400);
    expect(callArgs.trigger.seconds).toBeLessThanOrEqual(120 * 86400);
  });

  it('ignores past dates where cooldown has already elapsed', async () => {
    const longAgo = new Date(Date.now() - 200 * 86400000).toISOString().slice(0, 10);
    await scheduleRechargedReminder(longAgo, 'male');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('handles invalid date strings gracefully without throwing', async () => {
    await scheduleRechargedReminder('invalid-date', 'male');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
