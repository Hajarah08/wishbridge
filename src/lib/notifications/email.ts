import "server-only";

/**
 * Email delivery seam. In-app notifications are written by the database inside
 * the same transaction as the event (see private.notify). To add email, run a
 * worker (Supabase Edge Function / cron) that selects notifications where
 * email_sent_at is null, checks user_settings.email_notifications, sends through
 * an EmailSender implementation, then sets email_sent_at.
 *
 * Notification text is already anonymity-safe, so it can be emailed as-is.
 */
export interface EmailSender {
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  async send(input: { to: string; subject: string; text: string }) {
    console.info(`[email:dev] to=<redacted> subject=${JSON.stringify(input.subject)}`);
  }
}
