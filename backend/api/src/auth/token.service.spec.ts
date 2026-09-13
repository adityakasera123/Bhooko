import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService();
  });

  it('should generate a secure-looking refresh token', () => {
    const token = service.generateRefreshToken();

    expect(token).toBeDefined();
    expect(token).not.toHaveLength(0);
    expect(token).not.toContain('=');
  });

  it('should generate different refresh tokens', () => {
    const firstToken = service.generateRefreshToken();
    const secondToken = service.generateRefreshToken();

    expect(firstToken).not.toBe(secondToken);
  });

  it('should hash a refresh token', () => {
    const token = service.generateRefreshToken();

    const hash = service.hashRefreshToken(token);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
  });

  it('should return the same hash for the same token', () => {
    const token = service.generateRefreshToken();

    const firstHash = service.hashRefreshToken(token);
    const secondHash = service.hashRefreshToken(token);

    expect(firstHash).toBe(secondHash);
  });
});
