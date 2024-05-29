import { Module } from '@nestjs/common';
import { HubsModule } from './hubs/hubs.module';
// import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    HubsModule,
    // AdminModule,
    AuthModule,
    UsersModule,
    CloudinaryModule,
    CronModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
