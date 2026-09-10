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
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin';
    const superEmail =
      process.env.SEED_SUPER_ADMIN_EMAIL || 'supadmin@mail.com';
    const superPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SupAdmin';

    const newAdmin: Admin[] = [
      {
        email: adminEmail,
        name: 'Giftgo',
        phone: '+234 703 506 1222',
        password: await argon.hash(adminPassword),
        role: 'admin',
      },
      {
        email: superEmail,
        name: 'Test Admin',
        phone: '+234 701 711 1908',
        password: await argon.hash(superPassword),
        role: 'Super-admin',
      },
    ];

    return this.AdminModel.insertMany(newAdmin);
  }

  async drop(): Promise<any> {
    return this.AdminModel.deleteMany({});
  }
}
