import { Module } from '@nestjs/common';
import { User, UserSchema } from './schema';
import { Hub, HubSchema } from 'src/hubs/schema/hubs.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './users.controller';
import { UserService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hub.name, schema: HubSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UsersModule {}
