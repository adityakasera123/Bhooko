import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import Joi from 'joi';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { FoodModule } from './food/food.module';
import { CartModule } from './cart/cart.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        PORT: Joi.number()
          .port()
          .default(3000),

        DATABASE_URL: Joi.string()
          .uri({
            scheme: ['postgresql', 'postgres'],
          })
          .required(),

        JWT_ACCESS_SECRET: Joi.string()
          .min(32)
          .required(),

        JWT_ACCESS_EXPIRES_IN: Joi.string()
          .default('15m'),
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 20,
      },
    ]),

    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    RestaurantsModule,
    FoodModule,
    CartModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}