import webpush from 'web-push';
import db from '../db/client';
import type { PushSubscription } from '../types';

export function initWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.warn('[push] VAPID keys not configured — push notifications disabled');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('[push] VAPID configured');
}

export interface PushPayload {
  title: string;
  body: string;
  category: string;
  url?: string;
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all() as PushSubscription[];
  if (subs.length === 0) return;

  const json = JSON.stringify(payload);
  const staleIds: number[] = [];

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          staleIds.push(sub.id);
        } else {
          console.error('[push] send failed:', err);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    const del = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');
    const txn = db.transaction((ids: number[]) => { for (const id of ids) del.run(id); });
    txn(staleIds);
    console.log(`[push] removed ${staleIds.length} stale subscription(s)`);
  }
}
