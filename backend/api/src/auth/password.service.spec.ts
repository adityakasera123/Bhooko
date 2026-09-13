import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('should hash a password', async () => {
    const password = 'Bhooko@12345';

    const hash = await service.hash(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  it('should verify the correct password', async () => {
    const password = 'Bhooko@12345';

    const hash = await service.hash(password);

    await expect(service.verify(password, hash)).resolves.toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'Bhooko@12345';

    const hash = await service.hash(password);

    await expect(service.verify('WrongPassword@123', hash)).resolves.toBe(
      false,
    );
  });
});
