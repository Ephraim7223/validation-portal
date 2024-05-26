import { Module } from '@nestjs/common';
import { HubsModule } from './hubs/hubs.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    HubsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    SuperAdminModule,
    AdminModule,
    UsersModule,
    MongooseModule.forRoot(process.env.MONGODB_URI),
    CloudinaryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
