/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
import { seeder } from 'nestjs-seeder';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schema';

import { AdminSeeder } from './admin.seeder';

seeder({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
}).run([AdminSeeder]);
