// Push notifications (direct FCM via expo-notifications).
// registerPushToken claims the device's FCM token for the signed-in account via
// the register_push_token RPC; the send-push edge function reads push_tokens.
// Registration can fail quietly (no permission, no Play Services, emulator), so
// the outcome is kept in a small status store the settings screen reads back.
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

export type PushState = 'pending' | 'ok' | 'denied' | 'unsupported' | 'error';
export interface PushStatus {
  state: PushState;
  message?: string;
}

let status: PushStatus = { state: 'pending' };
const watchers = new Set<(s: PushStatus) => void>();

function setStatus(next: PushStatus): void {
  status = next;
  watchers.forEach(w => w(next));
}

export function getPushStatus(): PushStatus {
  return status;
}

// Subscribe to registration outcome. Fires immediately with the current value.
export function watchPushStatus(fn: (s: PushStatus) => void): () => void {
  watchers.add(fn);
  fn(status);
  return () => { watchers.delete(fn); };
}

export async function configurePushChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

function tokenString(resp: Notifications.DevicePushToken): string {
  return typeof resp.data === 'string' ? resp.data : String(resp.data);
}

// The RPC claims the token for auth.uid() and drops any other account's claim
// on the same device — a plain upsert can't, because RLS hides the other rows.
async function claimToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw new Error(error.message);
}

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) {
      setStatus({ state: 'unsupported', message: 'Emulators cannot receive push notifications.' });
      return;
    }
    // The channel must exist before a push arrives: Android silently drops a
    // notification whose channel_id it doesn't know.
    await configurePushChannel();

    const existing = await Notifications.getPermissionsAsync();
    let perm = existing.status;
    if (perm !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      perm = req.status;
    }
    if (perm !== 'granted') {
      setStatus({ state: 'denied' });
      return;
    }

    // getDevicePushTokenAsync returns the raw FCM token on Android.
    const token = tokenString(await Notifications.getDevicePushTokenAsync());
    if (!token) {
      setStatus({ state: 'error', message: 'Firebase returned no device token.' });
      return;
    }

    await claimToken(token);
    setStatus({ state: 'ok' });
  } catch (e: any) {
    setStatus({ state: 'error', message: String(e?.message ?? e) });
  }
}

// FCM rotates a device's token (app update, restore, cleared data). Without
// this the stored token goes stale, FCM starts rejecting it, send-push prunes
// it, and the device stops getting notifications until the next sign-in.
export function addPushTokenRotationHandler(): () => void {
  const sub = Notifications.addPushTokenListener(next => {
    const token = tokenString(next);
    if (!token) return;
    claimToken(token)
      .then(() => setStatus({ state: 'ok' }))
      .catch(e => setStatus({ state: 'error', message: String(e?.message ?? e) }));
  });
  return () => sub.remove();
}

// Drop a device's token (call on sign-out so a shared phone stops getting pushes).
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const token = tokenString(await Notifications.getDevicePushTokenAsync());
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch { /* nothing to remove */ }
  setStatus({ state: 'pending' });
}

export interface PushTapData {
  sector?: string;
  reference_id?: string;
  reference_type?: string;
}

function tapData(r: Notifications.NotificationResponse): PushTapData {
  return (r.notification.request.content.data ?? {}) as PushTapData;
}

// Fire `onTap` when the user taps a push. The listener only covers taps while
// the app is alive; a tap that cold-started the app arrives as the "last
// response" instead, so check that once on mount too.
export function addNotificationTapHandler(onTap: (data: PushTapData) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(r => onTap(tapData(r)));
  Notifications.getLastNotificationResponseAsync()
    .then(r => { if (r) onTap(tapData(r)); })
    .catch(() => {});
  return () => sub.remove();
}
