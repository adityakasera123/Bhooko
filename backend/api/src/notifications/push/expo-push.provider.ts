
import { Injectable, Logger } from '@nestjs/common';
import Expo, {
  type ExpoPushMessage,
  type ExpoPushReceipt,
  type ExpoPushTicket,
} from 'expo-server-sdk';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class ExpoPushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);
  private readonly expo = new Expo();

  isValidToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  async send(message: PushMessage): Promise<ExpoPushTicket | null> {
    if (!this.isValidToken(message.to)) {
      this.logger.warn('Skipping push notification with invalid Expo token.');
      return null;
    }

    const payload: ExpoPushMessage = {
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([payload]);
      return tickets[0] ?? null;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to submit push notification to Expo.',
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }


async getReceipts(
  ticketIds: string[],
): Promise<Record<string, ExpoPushReceipt>> {
  if (ticketIds.length === 0) {
    return {};
  }

  try {
    return await this.expo.getPushNotificationReceiptsAsync(ticketIds);
  } catch (error: unknown) {
    this.logger.error(
      'Failed to fetch push notification receipts from Expo.',
      error instanceof Error ? error.stack : undefined,
    );

    throw error;
  }
}

}
