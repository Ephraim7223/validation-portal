import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
// import { User } from 'src/users/schema/index';

export type HubDocument = HydratedDocument<Hub>;

@Schema({ timestamps: true })
export class Hub {
  @Prop({ required: true })
  hubName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  secretToken?: string;

  @Prop({ required: true })
  logo: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  TIN: string;

  @Prop({ required: true })
  CAC: string;

  @Prop({})
  hubId: string;

  @Prop({ default: false })
  isSuspended: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  hubs_users: Types.ObjectId[];

  @Prop({ default: 'hub' })
  role: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  paidAt: Date;

  _id: any;
}

export const HubSchema = SchemaFactory.createForClass(Hub);
