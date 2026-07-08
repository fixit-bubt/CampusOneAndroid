// Push notifications (direct FCM via expo-notifications).
// registerPushToken saves the device's FCM token to push_tokens; the send-push
// edge function reads it. Everything is defensive: with no google-services.json
// / FCM config yet, or if the user denies permission, this no-ops silently.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show a banner + play sound even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configurePushChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulators can't get FCM tokens reliably
    await configurePushChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    // getDevicePushTokenAsync returns the raw FCM token on Android.
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenResp.data === 'string' ? tokenResp.data : String(tokenResp.data);
    if (!token) return;

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
  } catch (e: any) {
    // No FCM config yet or permission denied — expected until Firebase is wired.
    console.log('push register skipped:', e?.message ?? e);
  }
}

// Drop a device's token (call on sign-out so a shared phone stops getting pushes).
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenResp.data === 'string' ? tokenResp.data : String(tokenResp.data);
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch { /* nothing to remove */ }
}

// Fire `onTap` when the user taps a push. The listener only covers taps while
// the app is alive; a tap that cold-started the app arrives as the "last
// response" instead, so check that once on mount too.
export function addNotificationTapHandler(onTap: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => onTap());
  Notifications.getLastNotificationResponseAsync()
    .then(r => { if (r) onTap(); })
    .catch(() => {});
  return () => sub.remove();
}
