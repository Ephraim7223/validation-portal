import { Module } from '@nestjs/common';
import { User, UserSchema } from './schema';
import { Hub, HubSchema } from 'src/hubs/schema/hubs.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { JwtStrategy } from 'src/common/strategy';
import { Admin, AdminSchema } from 'src/auth/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hub.name, schema: HubSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
})
export class UsersModule {}
