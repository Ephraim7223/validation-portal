import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from '../auth/schema';
import { Seeder } from 'nestjs-seeder';
import * as argon from 'argon2';

@Injectable()
export class AdminSeeder implements Seeder {
  constructor(
    @InjectModel(Admin.name)
    private readonly AdminModel: Model<AdminDocument>,
  ) {}

  async seed(): Promise<any> {
    const newAdmin: Admin[] = [
      {
        email: 'giftgo@gmail.com',
        name: 'Giftgo',
        phone: '+234 703 506 1222',
        password: await argon.hash('etrtrfhn'),
        role: 'admin',
      },
      {
        email: 'test-admin@mail.com',
        name: 'Test Admin',
        phone: '+234 701 711 1908',
        password: await argon.hash(' _tes@gift$go'),
        role: 'Super-admin',
      },
    ];

    // Insert into the database.
    return this.AdminModel.insertMany(newAdmin);
  }

  async drop(): Promise<any> {
    return this.AdminModel.deleteMany({});
  }
}
