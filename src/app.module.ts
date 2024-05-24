import { Module } from '@nestjs/common';
import { HubsModule } from './hubs/hubs.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [HubsModule, SuperAdminModule, AdminModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
