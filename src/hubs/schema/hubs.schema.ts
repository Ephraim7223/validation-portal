import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schema/index';

export type HubDocument = HydratedDocument<Hub>;

@Schema({ timestamps: true })
export class Hub {
  @Prop({ required: true })
  hubName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  secretToken?: string;

  @Prop({})
  logo: string;

  @Prop({})
  address: string;

  @Prop({})
  TIN: string;

  @Prop({})
  CAC: string;

  @Prop({})
  hubId: string;

  @Prop({})
  isSuspended: boolean;

  @Prop({})
  isVerified: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  hubs_users: User[];
}

export const HubSchema = SchemaFactory.createForClass(Hub);
