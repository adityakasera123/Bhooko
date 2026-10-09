
import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import Expo from 'expo-server-sdk';

import { ExpoPushProvider } from './expo-push.provider';

describe('ExpoPushProvider', () => {
  let provider: ExpoPushProvider;

  beforeEach(() => {
    provider = new ExpoPushProvider();
    jest.restoreAllMocks();
  });

  it('should validate a valid Expo push token', () => {
    expect(
      provider.isValidToken('ExponentPushToken[test-token]'),
    ).toBe(true);
  });

  it('should reject an invalid Expo push token', () => {
    expect(provider.isValidToken('not-a-token')).toBe(false);
  });

  it('should skip sending when the token is invalid', async () => {
    const sendSpy = jest.spyOn(
      Expo.prototype,
      'sendPushNotificationsAsync',
    );

    const result = await provider.send({
      to: 'not-a-token',
      title: 'Order confirmed',
      body: 'Your order has been confirmed.',
    });

    expect(result).toBeNull();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should return the Expo ticket after successful submission', async () => {
    const ticket = {
      status: 'ok',
      id: 'ticket-123',
    } as const;

    jest
      .spyOn(Expo.prototype, 'sendPushNotificationsAsync')
      .mockResolvedValue([ticket]);

    const result = await provider.send({
      to: 'ExponentPushToken[test-token]',
      title: 'Order confirmed',
      body: 'Your order has been confirmed.',
    });

    expect(result).toEqual(ticket);
  });

  it('should handle Expo submission errors without throwing', async () => {
    jest
      .spyOn(Expo.prototype, 'sendPushNotificationsAsync')
      .mockRejectedValue(new Error('Expo unavailable'));

    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const result = await provider.send({
      to: 'ExponentPushToken[test-token]',
      title: 'Order confirmed',
      body: 'Your order has been confirmed.',
    });

    expect(result).toBeNull();
    expect(loggerSpy).toHaveBeenCalled();
  });

  
  it('should fetch receipts for the supplied ticket IDs', async () => {
    const receipts = {
      'ticket-123': {
        status: 'ok' as const,
      },
    };

    const receiptSpy = jest
      .spyOn(Expo.prototype, 'getPushNotificationReceiptsAsync')
      .mockResolvedValue(receipts);

    const result = await provider.getReceipts(['ticket-123']);

    expect(receiptSpy).toHaveBeenCalledWith(['ticket-123']);
    expect(result).toEqual(receipts);
  });

  it('should return an empty object when no ticket IDs are supplied', async () => {
    const receiptSpy = jest.spyOn(
      Expo.prototype,
      'getPushNotificationReceiptsAsync',
    );

    const result = await provider.getReceipts([]);

    expect(result).toEqual({});
    expect(receiptSpy).not.toHaveBeenCalled();
  });

  it('should log and rethrow receipt-fetching errors', async () => {
    jest
      .spyOn(Expo.prototype, 'getPushNotificationReceiptsAsync')
      .mockRejectedValue(new Error('Expo unavailable'));

    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(provider.getReceipts(['ticket-123'])).rejects.toThrow(
      'Expo unavailable',
    );

    expect(loggerSpy).toHaveBeenCalled();
  });

});
