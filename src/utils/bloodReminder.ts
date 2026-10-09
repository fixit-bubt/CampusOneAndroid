import * as Notifications from 'expo-notifications';
import { DONATION_WAIT_DAYS_MALE, DONATION_WAIT_DAYS_FEMALE } from './blood';

export const BLOOD_RECHARGE_NOTIFICATION_ID = 'campusone_blood_recharge_reminder';

/**
 * Schedules an on-device push notification when the donor's 90-day (or 120-day)
 * recovery window has elapsed. Uses Android AlarmManager via expo-notifications
 * so it fires natively at the exact timestamp even if the app is closed.
 */
export async function cancelRechargedReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(BLOOD_RECHARGE_NOTIFICATION_ID);
  } catch {}
}

export async function scheduleRechargedReminder(
  lastDonatedDate: string,
  gender?: 'male' | 'female' | 'Male' | 'Female' | null,
  titleText: string = "Hero, you're fully recharged! 🩸",
  bodyText: string = "Your blood reserves have fully replenished. You are officially eligible to save a life again."
): Promise<void> {
  await cancelRechargedReminder();

  const isFemale = gender ? gender.toLowerCase() === 'female' : false;
  const waitDays = isFemale ? DONATION_WAIT_DAYS_FEMALE : DONATION_WAIT_DAYS_MALE;

  const then = new Date(lastDonatedDate).getTime();
  if (isNaN(then)) return;

  const rechargeTime = then + waitDays * 86400000;
  const secondsLeft = Math.floor((rechargeTime - Date.now()) / 1000);

  if (secondsLeft > 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: BLOOD_RECHARGE_NOTIFICATION_ID,
        content: {
          title: titleText,
          body: bodyText,
          sound: true,
          data: { screen: 'Blood' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsLeft,
        } as any,
      });
    } catch {}
  }
}
