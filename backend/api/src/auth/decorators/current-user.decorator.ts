import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  role: string;
}

export const currentUserFactory = (
  _data: unknown,
  context: ExecutionContext,
): CurrentUserPayload => {
  const request = context.switchToHttp().getRequest<{
    user: CurrentUserPayload;
  }>();

  return request.user;
};

export const CurrentUser = createParamDecorator(currentUserFactory);