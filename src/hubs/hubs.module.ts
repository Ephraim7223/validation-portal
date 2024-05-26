import { Module } from '@nestjs/common';
import { HubService } from './hubs.service';
import { HubsController } from './hubs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schema';
import { Hub, HubSchema } from './schema/hubs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hub.name, schema: HubSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HubsController],
  providers: [HubService],
})
export class HubsModule {}
