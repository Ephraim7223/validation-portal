import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/strategy';
import { User, UserSchema } from './schema/user.schema';

@Module({
  imports: [
    // JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
