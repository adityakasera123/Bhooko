import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  let registerCalls: unknown[] = [];
  let loginCalls: unknown[] = [];
  let refreshCalls: unknown[] = [];
  let logoutCalls: unknown[] = [];

  const authService = {
    register: async (dto: unknown) => {
      registerCalls.push(dto);

      return {
        id: 'user-1',
        name: 'Test User',
        email: 'test@bhooko.local',
        phone: '+919876543214',
        role: 'CUSTOMER',
      };
    },

    login: async (dto: unknown) => {
      loginCalls.push(dto);

      return {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          role: 'CUSTOMER',
        },
      };
    },

    refresh: async (dto: unknown) => {
      refreshCalls.push(dto);

      return {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
    },

    logout: async (dto: unknown) => {
      logoutCalls.push(dto);

      return {
        message: 'Logged out successfully',
      };
    },
  };

  beforeEach(() => {
    registerCalls = [];
    loginCalls = [];
    refreshCalls = [];
    logoutCalls = [];

    controller = new AuthController(
      authService as unknown as AuthService,
    );
  });

  it('should delegate registration to AuthService', async () => {
    const dto = {
      name: 'Test User',
      email: 'test@bhooko.local',
      phone: '+919876543214',
      password: 'Bhooko@12345',
    };

    const result = await controller.register(dto);

    expect(result).toEqual({
      id: 'user-1',
      name: 'Test User',
      email: 'test@bhooko.local',
      phone: '+919876543214',
      role: 'CUSTOMER',
    });

    expect(registerCalls).toEqual([dto]);
  });

  it('should delegate login to AuthService', async () => {
    const dto = {
      email: 'test@bhooko.local',
      password: 'Bhooko@12345',
    };

    const result = await controller.login(dto);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        role: 'CUSTOMER',
      },
    });

    expect(loginCalls).toEqual([dto]);
  });

  it('should delegate refresh to AuthService', async () => {
    const dto = {
      refreshToken: 'refresh-token',
    };

    const result = await controller.refresh(dto);

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(refreshCalls).toEqual([dto]);
  });

  it('should delegate logout to AuthService', async () => {
    const dto = {
      refreshToken: 'refresh-token',
    };

    const result = await controller.logout(dto);

    expect(result).toEqual({
      message: 'Logged out successfully',
    });

    expect(logoutCalls).toEqual([dto]);
  });
});