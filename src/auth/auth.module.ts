import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/strategy';
import { Admin, AdminSchema } from './schema/user.schema';
import { Hub, HubSchema } from 'src/hubs/schema/hubs.schema';
import { User, UserSchema } from 'src/users/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Hub.name, schema: HubSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
