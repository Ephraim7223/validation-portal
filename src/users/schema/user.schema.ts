import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { GENDER, ROLES } from './index';
import { Hub } from 'src/hubs/schema/hubs.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  phoneNumber: number;

  @Prop({ required: true })
  profilePic: string;

  @Prop({ required: true })
  NIN: number;

  @Prop({})
  qrcode: string;

  @Prop({ required: true })
  D_O_B: string;

  @Prop({})
  age: number;

  @Prop({ required: true, enum: GENDER })
  gender: string;

  @Prop({ required: true })
  Stack: string;

  @Prop({ required: true, enum: ROLES })
  role: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: false })
  isActiveMailSent: boolean;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({})
  userID: string;

  expiryDate: string;

  @Prop({})
  duration: number;

  @Prop({ enum: ['pending', 'approved', 'declined'], default: 'pending' })
  isApproved: string;

  @Prop({ enum: ['pending', 'called', 'done'], default: 'pending' })
  isCalledForInterview: string;

  @Prop({})
  start_date: string;

  @Prop({})
  end_date: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Boolean, default: false })
  isTerminated: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Hub' })
  hub: Hub;

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
