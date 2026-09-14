import {
  CurrentUserPayload,
  currentUserFactory,
} from './current-user.decorator';

describe('currentUserFactory', () => {
  it('should return the authenticated user from the request', () => {
    const user: CurrentUserPayload = {
      userId: 'user-123',
      role: 'CUSTOMER',
    };

    const request = {
      user,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    const result = currentUserFactory(undefined, context as never);

    expect(result).toEqual(user);
  });
});