import * as QRCode from 'qrcode';
import * as cron from 'node-cron';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateHubDto,
  SignInDto,
  UpdatePaidStatusDto,
} from './dto/create-hub.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import * as argon from 'argon2';
import { Hub } from './schema/hubs.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { User } from 'src/users/schema';
import { SuccessMail } from 'src/templates/success';
import {
  ApproveApplicationDto,
  ApproveUserDto,
  ScheduleInterviewDto,
} from 'src/users/dto/create-user.dto';
import { JwtHelper } from 'src/common/helpers';
import {
  generateHubID,
  generateUserID,
} from 'src/functions/genrating-random-number';
import { VerifiedMail } from 'src/templates/verified';
import { SuspensionMail } from 'src/templates/suspensionMail';
import { UnSuspensionHubMail } from 'src/templates/unSuspendedHubMail';
import { AcceptanceMail } from 'src/templates/acceptanceMail';
import { InterviewMail } from 'src/templates/interviewMail';
import { SubscriptionStatusMail } from 'src/templates/suscriptionMail';
import { SubscriptionExpiryMail } from 'src/templates/expiredSuscriptionMail';
import { ForgotPasswordDto, ResetPasswordDto } from 'src/auth/dto';
import { IResponse } from 'src/interfaces';
import { PasswordResetMail } from 'src/templates/password.reset.mail';
import { sanitizeDocument } from 'src/common/helpers';
import { randomInt } from 'crypto';
import {
  digitsOnly,
  emailsMatch,
  isValidPhoneInput,
  phoneMatchVariants,
  phoneMatchesStored,
} from 'src/utils/phone.util';

@Injectable()
export class HubService {
  private readonly logger = new Logger(HubService.name);
  private readonly otps: Map<string, { otp: string; timer: NodeJS.Timeout }> =
    new Map();
  constructor(
    @InjectModel(Hub.name)
    private readonly hubModel: Model<Hub>,
    private readonly cloudinary: CloudinaryService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinary1: CloudinaryService,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private getPublicIdFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0];
    return publicId;
  }

  async checkUniqueFields(email?: string, phoneNumber?: string, NIN?: string) {
    // User uniqueness (used by hub register-user / applicant flows)
    const or: Record<string, unknown>[] = [];
    if (email?.trim()) {
      or.push({ email: email.trim().toLowerCase() });
      or.push({ email: email.trim() });
    }
    if (phoneNumber) {
      const variants = phoneMatchVariants(phoneNumber);
      if (variants.length) or.push({ phoneNumber: { $in: variants } });
    }
    if (NIN) {
      const ninDigits = digitsOnly(NIN);
      if (ninDigits) {
        or.push({ NIN: ninDigits }, { NIN: Number(ninDigits) });
      }
    }

    if (!or.length) {
      return {
        statusCode: 400,
        message: 'Provide at least one of email, phoneNumber, or NIN',
        data: null,
        error: {
          code: 'MISSING_QUERY',
          message: 'Provide at least one of email, phoneNumber, or NIN',
        },
      };
    }

    const existingUser = await this.userModel.findOne({ $or: or });

    if (existingUser) {
      const conflicts: string[] = [];
      if (email && emailsMatch(email, existingUser.email)) conflicts.push('email');
      if (
        phoneNumber &&
        phoneMatchesStored(phoneNumber, existingUser.phoneNumber)
      ) {
        conflicts.push('phoneNumber');
      }
      if (NIN && digitsOnly(NIN) === digitsOnly(existingUser.NIN)) {
        conflicts.push('NIN');
      }

      const message =
        conflicts.length === 1
          ? `${conflicts[0] === 'phoneNumber' ? 'Phone number' : conflicts[0]} already exists`
          : 'One or more fields already exist';

      return {
        statusCode: 409,
        message,
        data: { conflicts },
        error: {
          code: 'FIELD_ALREADY_EXIST',
          message,
        },
      };
    }

    return {
      statusCode: 200,
      message: 'Fields are unique',
      data: null,
      error: null,
    };
  }

  async checkUniqueField(email?: string, phone?: string) {
    const or: Record<string, unknown>[] = [];

    if (email?.trim()) {
      const normalizedEmail = email.trim();
      or.push({ email: normalizedEmail });
      or.push({ email: normalizedEmail.toLowerCase() });
    }

    if (phone) {
      if (!isValidPhoneInput(phone)) {
        return {
          statusCode: 400,
          message: 'Invalid phone number format',
          data: null,
          error: {
            code: 'INVALID_PHONE',
            message: 'Invalid phone number format',
          },
        };
      }
      const variants = phoneMatchVariants(phone);
      if (variants.length) {
        or.push({ phone: { $in: variants } });
      }
    }

    if (!or.length) {
      return {
        statusCode: 400,
        message: 'Provide at least one of email or phone',
        data: null,
        error: {
          code: 'MISSING_QUERY',
          message: 'Provide at least one of email or phone',
        },
      };
    }

    const existingHub = await this.hubModel.findOne({ $or: or });

    if (existingHub) {
      const emailTaken = !!(email && emailsMatch(email, existingHub.email));
      const phoneTaken = !!(
        phone && phoneMatchesStored(phone, existingHub.phone)
      );
      const conflicts: string[] = [];
      if (emailTaken) conflicts.push('email');
      if (phoneTaken) conflicts.push('phone');

      // If $or matched but field compare failed (casing / legacy), still report accurately
      if (!conflicts.length) {
        if (email) conflicts.push('email');
        else if (phone) conflicts.push('phone');
      }

      const message =
        conflicts.length === 1 && conflicts[0] === 'phone'
          ? 'Phone number already exists, please use a different number'
          : conflicts.length === 1 && conflicts[0] === 'email'
            ? 'Email already exists, please use a different email'
            : 'Hub with existing email or phone already exists';

      return {
        statusCode: 409,
        message,
        data: { conflicts },
        error: {
          code: 'FIELD_ALREADY_EXIST',
          message,
        },
      };
    }

    return {
      statusCode: 200,
      message: 'Fields are unique',
      data: null,
      error: null,
    };
  }

  calculateDurationInMonths(startDate: Date, endDate: Date): number {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    return (endYear - startYear) * 12 + (endMonth - startMonth);
  }

  isValidObjectId(id: string): boolean {
    return (
      mongoose.Types.ObjectId.isValid(id) &&
      new mongoose.Types.ObjectId(id).toString() === id
    );
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Case-insensitive exact email match (trims whitespace). */
  private emailQuery(email: string) {
    const normalized = email.trim();
    return {
      email: {
        $regex: `^${this.escapeRegex(normalized)}$`,
        $options: 'i',
      },
    };
  }

  private async findHubByIdOrHubId(id: string) {
    if (!id?.trim()) return null;
    const trimmed = id.trim();
    if (this.isValidObjectId(trimmed)) {
      const byId = await this.hubModel.findById(trimmed);
      if (byId) return byId;
    }
    return this.hubModel.findOne({ hubId: trimmed });
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<IResponse> {
    const { email } = forgotPasswordDto;

    if (!email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    const normalizedEmail = email.trim();
    const user = await this.hubModel
      .findOne(this.emailQuery(normalizedEmail))
      .select('+otp +otpCreatedAt');

    if (!user) {
      throw new NotFoundException(
        `User with email ${normalizedEmail} not found`,
      );
    }

    const otp = this.generateOtp();
    const timeoutMinutes = 10;

    user.otp = otp;
    user.otpCreatedAt = new Date();
    await user.save();

    const storedEmail = user.email;

    setTimeout(
      async () => {
        const userToUpdate = await this.hubModel
          .findOne(this.emailQuery(storedEmail))
          .select('+otp +otpCreatedAt');
        if (userToUpdate && userToUpdate.otp === otp) {
          userToUpdate.otp = undefined;
          userToUpdate.otpCreatedAt = undefined;
          await userToUpdate.save();
          this.logger.log(`Expired OTP cleared from database`);
        }
      },
      timeoutMinutes * 60 * 1000,
    );

    try {
      await PasswordResetMail.sendOtp(storedEmail, otp, timeoutMinutes);
    } catch (mailError) {
      this.logger.error(
        `Failed to send password-reset OTP mail to ${storedEmail}`,
        mailError instanceof Error ? mailError.stack : undefined,
      );
      throw new BadRequestException(
        'Could not send OTP email. Please try again shortly.',
      );
    }

    return {
      statusCode: 200,
      message: 'OTP sent to email',
      data: null,
      error: null,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<IResponse> {
    const { otp, newPassword, confirmPassword } = resetPasswordDto;

    if (!otp || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'OTP, newPassword, and confirmPassword are required',
      );
    }

    const user = await this.hubModel
      .findOne({ otp })
      .select('+otp +otpCreatedAt +password');

    if (!user || user.otp !== otp || !user.otpCreatedAt) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const otpCreationTime = user.otpCreatedAt.getTime();
    const now = Date.now();
    const timeoutMinutes = 10;

    if (now - otpCreationTime > timeoutMinutes * 60 * 1000) {
      throw new UnauthorizedException('OTP has expired');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await argon.hash(newPassword);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpCreatedAt = undefined;
    await user.save();

    return {
      statusCode: 200,
      message: 'Password reset successfully',
      data: null,
      error: null,
    };
  }

  async register(createHubDto: CreateHubDto) {
    let response: any;
    const { email, hubName, phone } = createHubDto;

    if (!isValidPhoneInput(phone)) {
      return {
        statusCode: 400,
        message: 'Invalid phone number format',
        data: null,
        error: {
          code: 'INVALID_PHONE',
          message: 'Invalid phone number format',
        },
      };
    }

    const phoneVariants = phoneMatchVariants(phone);
    const normalizedEmail = email?.trim();

    this.logger.log('Looking for a hub with an existing email or phone');
    const existingHub = await this.hubModel.findOne({
      $or: [
        { email: normalizedEmail },
        { email: normalizedEmail?.toLowerCase() },
        { phone: { $in: phoneVariants } },
      ],
    });

    if (existingHub) {
      const emailTaken = emailsMatch(normalizedEmail, existingHub.email);
      const phoneTaken = phoneMatchesStored(phone, existingHub.phone);

      const message =
        emailTaken && !phoneTaken
          ? 'Email already exists, please use a different email'
          : phoneTaken && !emailTaken
            ? 'Phone number already exists, please use a different number'
            : 'Hub with existing email or phone already exists';

      response = {
        statusCode: 409,
        message,
        data: {
          conflicts: [
            ...(emailTaken ? ['email'] : []),
            ...(phoneTaken ? ['phone'] : []),
          ],
        },
        error: {
          code: 'HUB_ALREADY_EXIST',
          message,
        },
      };
    } else {
      this.logger.log(`uploading CAC to cloud...`);
      const CAC = await this.cloudinary.upload(createHubDto.CAC[0]);

      this.logger.log(`uploading logo to cloud...`);
      const logo = await this.cloudinary.upload(createHubDto.logo[0]);

      delete createHubDto.CAC;
      delete createHubDto.logo;

      this.logger.log(`creating new application...`);
      const hashedPassword = await argon.hash(createHubDto.password);

      const hubId = generateHubID(hubName);
      // Store as digit string for consistent uniqueness (legacy rows may be numbers)
      const phoneToStore = digitsOnly(phone);

      const newHub = await this.hubModel.create({
        ...createHubDto,
        email: normalizedEmail,
        hubId,
        phone: phoneToStore,
        password: hashedPassword,
        CAC: CAC.secure_url,
        logo: logo.secure_url,
      });

      this.logger.log(`sending success email`);
      await SuccessMail.mail(newHub.hubName, newHub.email);

      response = {
        statusCode: 201,
        message: 'hub created successfully',
        data: sanitizeDocument(newHub),
        error: null,
      };
    }

    this.logger.log(
      `Hub register response status=${response?.statusCode} message=${response?.message}`,
    );
    return response;
  }

  async createUser(createUserDto: ApproveUserDto, hubId: string) {
    const { email, NIN, phoneNumber, D_O_B, start_date, end_date } =
      createUserDto;

    try {
      const ninAsNumber = parseInt(NIN, 10);
      if (isNaN(ninAsNumber)) {
        return {
          statusCode: 400,
          message: 'Invalid NIN format',
          data: null,
          error: null,
        };
      }

      const phoneNumberAsNumber = parseInt(phoneNumber, 10);
      if (isNaN(phoneNumberAsNumber)) {
        return {
          statusCode: 400,
          message: 'Invalid phone number format',
          data: null,
          error: null,
        };
      }

      const parsedDOB = new Date(D_O_B);
      if (isNaN(parsedDOB.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid date of birth format',
          data: null,
          error: null,
        };
      }

      const today = new Date();
      let age = today.getFullYear() - parsedDOB.getFullYear();
      const m = today.getMonth() - parsedDOB.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedDOB.getDate())) {
        age--;
      }

      const existingUser = await this.userModel.findOne({
        $or: [
          { email },
          { email: email?.trim()?.toLowerCase() },
          { phoneNumber: { $in: phoneMatchVariants(phoneNumber) } },
          { NIN: ninAsNumber },
          { NIN: digitsOnly(NIN) },
        ],
      });
      if (existingUser) {
        const emailTaken = emailsMatch(email, existingUser.email);
        const phoneTaken = phoneMatchesStored(
          phoneNumber,
          existingUser.phoneNumber,
        );
        const ninTaken = digitsOnly(NIN) === digitsOnly(existingUser.NIN);

        const message =
          [emailTaken, phoneTaken, ninTaken].filter(Boolean).length === 1
            ? emailTaken
              ? 'Email already exists, please use a different email'
              : phoneTaken
                ? 'Phone number already exists, please use a different number'
                : 'NIN already exists, please use a different NIN'
            : 'User with existing email, phone number, or NIN already exists';

        return {
          statusCode: 409,
          message,
          data: {
            conflicts: [
              ...(emailTaken ? ['email'] : []),
              ...(phoneTaken ? ['phoneNumber'] : []),
              ...(ninTaken ? ['NIN'] : []),
            ],
          },
          error: {
            code: 'USER_ALREADY_EXIST',
            message,
          },
        };
      }

      this.logger.log(`Uploading profile picture to cloud...`);
      const profilePic = await this.cloudinary.upload(
        createUserDto.profilePic[0],
      );
      delete createUserDto.profilePic;

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid start date or end date',
          data: null,
          error: null,
        };
      }

      const duration = this.calculateDurationInMonths(startDate, endDate);

      const newUser = new this.userModel({
        ...createUserDto,
        hub: hubId,
        NIN: ninAsNumber,
        phoneNumber: digitsOnly(phoneNumber) || phoneNumberAsNumber,
        profilePic: profilePic.secure_url,
        age,
        isPaid: true,
        isActive: true,
        isApproved: 'approved',
        isCalledForInterview: 'done',
        userID: generateUserID(createUserDto.role),
        duration,
      });

      await newUser.save();

      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }
      hub.hubs_users.push(newUser._id);
      await hub.save();

      const websiteUrl = 'https://verifytech.netlify.app/';

      const qrCodeData = await QRCode.toDataURL(websiteUrl);
      newUser.qrcode = qrCodeData;
      await newUser.save();

      this.logger.log(`Sending successful application email`);
      await AcceptanceMail.mail(
        newUser.firstName,
        newUser.lastName,
        hub.hubName,
        newUser.userID,
        newUser.Stack,
        newUser.role,
        newUser.duration,
        newUser.email,
        newUser._id,
      );

      return {
        statusCode: 201,
        message: 'User saved successfully',
        data: sanitizeDocument(newUser),
        error: null,
      };
    } catch (error) {
      this.logger.error('Error creating user', error);
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  async login(signInDto: SignInDto) {
    try {
      const hub = await this.hubModel
        .findOne({ hubId: signInDto.hubId })
        .select('+password');
      if (!hub) {
        throw new UnauthorizedException('Invalid hubId');
      }

      if (hub.isVerified === false) {
        throw new UnauthorizedException('Account not verified');
      }

      if (hub.isSuspended === true) {
        throw new UnauthorizedException('Account is suspended');
      }

      const passMatches = await argon.verify(hub.password, signInDto.password);
      if (!passMatches) {
        throw new UnauthorizedException('Invalid password');
      }

      const token = JwtHelper.signToken(hub._id, hub.role);

      return {
        statusCode: 200,
        message: 'Login successful',
        data: { token, hub: sanitizeDocument(hub) },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error;
    }
  }

  async getAllHubs() {
    try {
      const hubs = await this.hubModel.find().populate('hubs_users');
      return {
        statusCode: 200,
        message: 'Hubs retrieved successfully',
        data: sanitizeDocument(hubs),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving hubs: ${error.message}`);
      throw new BadRequestException('Could not retrieve hubs');
    }
  }

  async verifyHub(id: string) {
    try {
      const hubToUpdate = await this.findHubByIdOrHubId(id);
      if (!hubToUpdate) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToUpdate.isVerified === true) {
        throw new BadRequestException('Hub is already verified');
      }

      hubToUpdate.isVerified = true;
      const updatedHub = await hubToUpdate.save();

      if (!updatedHub) {
        throw new BadRequestException('Error updating hub');
      }

      try {
        await VerifiedMail.mail(
          updatedHub.email,
          updatedHub.hubName,
          updatedHub.hubId,
        );
      } catch (mailError) {
        this.logger.error(
          `Hub verified but verification email failed for ${updatedHub.email}`,
          mailError instanceof Error ? mailError.stack : undefined,
        );
      }

      return {
        statusCode: 200,
        message: 'Hub verification successful',
        data: sanitizeDocument(updatedHub),
        error: null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error verifying hub: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException('Could not verify hub');
    }
  }

  async getSingleHub(id: string) {
    try {
      const hub = await this.hubModel.findById(id).populate('hubs_users');

      if (!hub) {
        throw new NotFoundException('Hub not found');
      }

      let expiryDate = null;
      if (hub.isPaid && hub.paidAt) {
        expiryDate = new Date(hub.paidAt);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      return {
        statusCode: 200,
        message: 'Hub retrieved successfully',
        data: {
          ...sanitizeDocument(hub.toObject()),
          expiryDate: expiryDate,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving single hub: ${error.message}`);
      throw new BadRequestException('Could not retrieve hub');
    }
  }

  async deleteHub(id: string) {
    try {
      const hubToDelete = await this.hubModel.findById(id);
      if (!hubToDelete) {
        throw new NotFoundException('Hub not found');
      }

      await hubToDelete.deleteOne();

      return {
        statusCode: 200,
        message: 'Hub deleted successfully',
        data: null,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting hub: ${error.message}`);
      throw new BadRequestException('Could not delete hub');
    }
  }

  async suspendHub(id: string) {
    try {
      const hubToSuspend = await this.hubModel.findById(id);
      if (!hubToSuspend) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToSuspend.isSuspended === true) {
        throw new BadRequestException('Hub is already suspended');
      }

      hubToSuspend.isSuspended = true;
      await hubToSuspend.save();
      await SuspensionMail.mail(hubToSuspend.hubName, hubToSuspend.email);

      return {
        statusCode: 200,
        message: 'Hub suspended successfully',
        data: sanitizeDocument(hubToSuspend),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error suspending hub: ${error.message}`);
      throw new BadRequestException('Could not suspend hub');
    }
  }

  async unsuspendHub(id: string) {
    try {
      const hubToUnsuspend = await this.hubModel.findById(id);
      if (!hubToUnsuspend) {
        throw new NotFoundException('Hub not found');
      }

      if (hubToUnsuspend.isSuspended === false) {
        throw new BadRequestException('Hub is not suspended');
      }

      hubToUnsuspend.isSuspended = false;
      await hubToUnsuspend.save();
      await UnSuspensionHubMail.mail(
        hubToUnsuspend.hubName,
        hubToUnsuspend.email,
      );

      return {
        statusCode: 200,
        message: 'Hub unsuspended successfully',
        data: sanitizeDocument(hubToUnsuspend),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error unsuspending hub: ${error.message}`);
      throw new BadRequestException('Could not unsuspend hub');
    }
  }

  async approveUser(
    approveApplicationDto: ApproveApplicationDto,
    userId: string,
    hubId: string,
  ) {
    const { start_date, end_date } = approveApplicationDto;

    if (!this.isValidObjectId(userId)) {
      return {
        statusCode: 400,
        message: 'Invalid user id',
        data: null,
        error: null,
      };
    }

    const user = await this.userModel.findOne({ _id: userId, hub: hubId });

    if (!user) {
      return {
        statusCode: 404,
        message:
          'No user found with this id or the user does not belong to this hub',
        data: null,
        error: null,
      };
    }

    if (user.isDeleted) {
      return {
        statusCode: 400,
        message: 'Cannot approve a deleted user',
        data: null,
        error: null,
      };
    }

    if (user.isApproved === 'approved') {
      return {
        statusCode: 400,
        message: 'User is already approved',
        data: null,
        error: null,
      };
    }

    try {
      const { email, firstName, lastName, Stack, role } = user;

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          statusCode: 400,
          message: 'Invalid start date or end date',
          data: null,
          error: null,
        };
      }

      const duration = this.calculateDurationInMonths(startDate, endDate);

      const userID = generateUserID(role);

      user.duration = duration;
      user.userID = user.userID || userID;

      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        return {
          statusCode: 404,
          message: 'Hub not found',
          data: null,
          error: null,
        };
      }

      user.isApproved = 'approved';
      user.isCalledForInterview = 'done';
      user.isPaid = true;
      user.isActive = true;
      await user.save();

      try {
        await AcceptanceMail.mail(
          firstName,
          lastName,
          hub.hubName,
          user.userID,
          Stack,
          role,
          duration,
          email,
          user._id?.toString?.() ?? user._id,
        );
      } catch (mailError) {
        this.logger.error(
          `User approved but acceptance email failed for ${email}`,
          mailError instanceof Error ? mailError.stack : undefined,
        );
      }

      return {
        statusCode: 200,
        message: 'User approved successfully',
        data: sanitizeDocument(user),
        error: null,
      };
    } catch (err) {
      this.logger.error(
        `Error updating user with id: [${userId}]`,
        err instanceof Error ? err.stack : undefined,
      );
      return {
        statusCode: 400,
        message: 'An error occurred updating user',
        data: null,
        error: {
          code: 'APPROVE_FAILED',
          message: 'An error occurred updating user',
        },
      };
    }
  }

  async scheduleInterview(
    userId: string,
    hubId: string,
    interviewDto: ScheduleInterviewDto,
  ) {
    const user = await this.userModel.findOne({
      _id: userId,
      hub: hubId,
    });

    if (!user) {
      return {
        statusCode: 404,
        message:
          'No user found with this ID or the user does not belong to this hub',
        data: null,
        error: null,
      };
    }

    if (user.isCalledForInterview === 'done') {
      return {
        statusCode: 400,
        message: 'User is already scheduled for an interview',
        data: null,
        error: null,
      };
    }

    if (
      (interviewDto.interviewDate && !interviewDto.interviewTime) ||
      (!interviewDto.interviewDate && interviewDto.interviewTime)
    ) {
      return {
        statusCode: 400,
        message:
          'Both a valid date and time are required for an interview call',
        data: null,
        error: null,
      };
    }

    try {
      const hub = await this.hubModel.findById(hubId);
      if (!hub) {
        return {
          statusCode: 404,
          message: 'Hub not found',
          data: null,
          error: null,
        };
      }

      const interviewLocation = hub.address;

      user.isCalledForInterview = 'called';
      user.interviewDate = interviewDto.interviewDate;
      user.interviewTime = interviewDto.interviewTime;
      user.interview_location = interviewLocation;
      await user.save();

      await InterviewMail.mail(
        user.email,
        user.firstName,
        user.lastName,
        interviewDto.interviewDate,
        interviewDto.interviewTime,
        interviewLocation,
      );

      return {
        statusCode: 200,
        message: 'Interview scheduled successfully',
        data: sanitizeDocument(user),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error scheduling interview for user ${userId}: ${error.message}`,
      );
      return {
        statusCode: 400,
        message: 'An error occurred scheduling the interview',
        data: null,
        error: error,
      };
    }
  }

  async getUsersPendingInterview(hubId: string) {
    try {
      const hub = await this.hubModel.findById(hubId).populate('hubs_users');
      // .exec();
      if (!hub) {
        throw new NotFoundException('Hub not found');
      }

      const usersPendingInterview = hub.hubs_users.filter((user: any) => {
        return user.isCalledForInterview !== 'done';
      });

      return {
        statusCode: 200,
        message: 'Users pending interview retrieved successfully',
        data: sanitizeDocument(usersPendingInterview),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving users pending interview for hub ${hubId}: ${error.message}`,
      );
      throw new BadRequestException(
        'Could not retrieve users pending interview',
      );
    }
  }

  async getUsersUnderHub(hubId: string) {
    try {
      if (!this.isValidObjectId(hubId)) {
        throw new BadRequestException('Invalid hub ID format');
      }

      const usersUnderHub = await this.userModel.find({ hub: hubId });

      const hubExists = await this.hubModel.exists({ _id: hubId });
      if (!hubExists) {
        throw new NotFoundException('Hub not found');
      }

      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: sanitizeDocument(usersUnderHub),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving users for hub ${hubId}: ${error.message}`,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Could not retrieve users');
    }
  }

  async getSingleUser(hubId: string, userId: string) {
    try {
      const user = await this.userModel.findOne({ _id: userId, hub: hubId });
      if (!user) {
        throw new NotFoundException(
          'User not found or does not belong to this hub',
        );
      }
      return {
        statusCode: 200,
        message: 'User retrieved successfully',
        data: sanitizeDocument(user),
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving user ${userId} for hub ${hubId}: ${error.message}`,
      );
      throw new BadRequestException('Could not retrieve user');
    }
  }

  async getUsersByRole(role: string, hubId: any) {
    try {
      const users = await this.userModel
        .find({ role, hub: hubId })
        .populate('hub');
      return {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: sanitizeDocument(users),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error retrieving users by role: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getStacksCount(hubId: string) {
    try {
      const userStacks = await this.userModel
        .find({ hub: hubId })
        .select('Stack')
        .exec();
      const stackCounts = userStacks.reduce((counts, user) => {
        const stack = user.Stack;
        if (!counts[stack]) {
          counts[stack] = 0;
        }
        counts[stack]++;
        return counts;
      }, {});

      return {
        statusCode: 200,
        message: 'Stacks count retrieved successfully',
        data: stackCounts,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error fetching stacks count: ${error.message}`);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getPendingUsers(hubId: string) {
    try {
      const pendingUsers = await this.userModel
        .find({ hub: hubId, isApproved: 'pending' })
        .exec();

      return {
        statusCode: 200,
        message: 'Pending users retrieved successfully',
        data: pendingUsers,
        error: null,
      };
    } catch (error) {
      throw new BadRequestException('Internal Server Error');
    }
  }

  async getUsersCountByRoleAndMonth(hubId: string) {
    try {
      const currentYear = new Date().getFullYear();
      const roles = ['Intern', 'Private', 'Freelancer'];
      const userCountsByRoleAndMonth = [];

      for (const role of roles) {
        const roleUsers = await this.userModel
          .find({
            hub: hubId,
            role,
            createdAt: {
              $gte: new Date(`${currentYear}-01-01`),
              $lt: new Date(`${currentYear + 1}-01-01`),
            },
          })
          .exec();

        const countsByMonth = Array.from({ length: 12 }, () => 0);

        for (const user of roleUsers) {
          const month = new Date(user.createdAt).getMonth();
          countsByMonth[month]++;
        }

        userCountsByRoleAndMonth.push({
          role,
          countsByMonth,
        });
      }

      return {
        statusCode: 200,
        message: 'User counts by role and month retrieved successfully',
        data: sanitizeDocument(userCountsByRoleAndMonth),
        error: null,
      };
    } catch (error) {
      console.error('Error fetching user counts by role and month:', error);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async updatePaidStatus(
    hubId: string,
    updatePaidStatusDto: UpdatePaidStatusDto,
  ) {
    const { isPaid } = updatePaidStatusDto;
    const hub = await this.hubModel.findById(hubId);

    if (!hub) {
      throw new NotFoundException('Hub not found');
    }

    hub.isPaid = isPaid;
    hub.paidAt = new Date();
    await hub.save();

    await SubscriptionStatusMail.mail(hub.hubName, hub.email, isPaid, hub._id);

    this.scheduleExpiryTask(hubId, hub.paidAt);

    return {
      statusCode: 200,
      message: 'Hub payment status updated successfully',
      data: sanitizeDocument(hub),
      error: null,
    };
  }

  private scheduleExpiryTask(hubId: string, paidAt: Date) {
    this.logger.log(`Scheduling expiry task for hub ${hubId}`);

    const job = cron.schedule(
      `*/20 * * * *`,
      async () => {
        try {
          const hub = await this.hubModel.findById(hubId);
          if (!hub) {
            this.logger.warn(`Hub ${hubId} not found during expiry task`);
            job.stop();
            return;
          }

          const now = new Date();
          const twentyMinutesLater = new Date(paidAt.getTime() + 20 * 60000);

          if (now >= twentyMinutesLater) {
            hub.isPaid = false;
            await hub.save();
            this.logger.log(
              `Updated hub ${hubId} isPaid to false after 20 minutes.`,
            );
            await SubscriptionExpiryMail.mail(hub.hubName, hub.email);
            job.stop();
          } else {
            this.logger.log(
              `Hub ${hubId} is still active. Next check in 20 minutes.`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error in expiry task for hub ${hubId}: ${error.message}`,
          );
        }
      },
      { scheduled: true },
    );
  }

  async getMe(hubId: string): Promise<IResponse> {
    if (!this.isValidObjectId(hubId)) {
      throw new BadRequestException('Invalid hub ID format');
    }

    const hub = await this.hubModel.findById(hubId).select({
      password: 0,
      otp: 0,
      otpCreatedAt: 0,
    });

    if (!hub) {
      throw new NotFoundException('Hub not found');
    }

    const hubUsers = await this.userModel.find({ hub: hubId }).select({
      password: 0,
      otp: 0,
      otpCreatedAt: 0,
    });

    return {
      statusCode: 200,
      message: 'Hub details retrieved successfully',
      data: {
        hub,
        users: hubUsers,
      },
      error: null,
    };
  }
}
