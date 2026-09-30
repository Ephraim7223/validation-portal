import * as QRCode from 'qrcode';
import {
  BadRequestException,
  ForbiddenException,
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
import {
  JwtHelper,
  sanitizeDocument,
  dispatchMail,
  canonicalPersonnelRole,
  normalizeAccountRole,
} from 'src/common/helpers';
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
import { ForgotPasswordDto, ResetPasswordDto } from 'src/auth/dto';
import { IResponse } from 'src/interfaces';
import { PasswordResetMail } from 'src/templates/password.reset.mail';
import { randomInt } from 'crypto';
import {
  digitsOnly,
  emailsMatch,
  isValidPhoneInput,
  phoneMatchVariants,
  phoneMatchesStored,
} from 'src/utils/phone.util';
import {
  membershipDateError,
  validateApplicantFields,
} from 'src/utils/applicant.validation';

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
      if (!/^\d{11}$/.test(ninDigits)) {
        return {
          statusCode: 400,
          message: 'NIN must be 11 digits',
          data: null,
          error: {
            code: 'INVALID_NIN',
            message: 'NIN must be 11 digits',
          },
        };
      }
      or.push({ NIN: ninDigits }, { NIN: Number(ninDigits) });
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
    const hasEmail = !!email?.trim();
    const hasPhone = !!phone?.trim();

    if (!hasEmail && !hasPhone) {
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

    if (hasPhone && !isValidPhoneInput(phone)) {
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

    const conflicts: string[] = [];

    if (hasEmail) {
      const existingByEmail = await this.hubModel.findOne(
        this.emailQuery(email.trim()),
      );
      if (existingByEmail) conflicts.push('email');
    }

    if (hasPhone) {
      const existingByPhone = await this.hubModel.findOne({
        phone: { $in: phoneMatchVariants(phone) },
      });
      if (existingByPhone) conflicts.push('phone');
    }

    if (conflicts.length) {
      const message =
        conflicts.length === 2
          ? 'Hub with existing email or phone already exists'
          : conflicts[0] === 'email'
            ? 'Email already exists, please use a different email'
            : 'Phone number already exists, please use a different number';

      return {
        statusCode: 409,
        message,
        data: { conflicts },
        error: {
          code:
            conflicts.length === 2
              ? 'HUB_ALREADY_EXIST'
              : conflicts[0] === 'email'
                ? 'EMAIL_ALREADY_EXIST'
                : 'PHONE_ALREADY_EXIST',
          message,
        },
      };
    }

    const message =
      hasEmail && hasPhone
        ? 'Email and phone are unique'
        : hasEmail
          ? 'Email is unique'
          : 'Phone number is unique';

    return {
      statusCode: 200,
      message,
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

  /** A paid hub stays active for one year from paidAt. */
  private subscriptionExpiry(paidAt?: Date | string | null): Date | null {
    if (!paidAt) return null;
    const paid = new Date(paidAt);
    if (Number.isNaN(paid.getTime())) return null;
    const expiry = new Date(paid);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  private subscriptionIsActive(hub: {
    isPaid?: boolean;
    paidAt?: Date | string | null;
  }): boolean {
    const expiry = this.subscriptionExpiry(hub.paidAt);
    if (!expiry) return hub.isPaid === true;
    return expiry.getTime() > Date.now();
  }

  /** Keep the stored flag aligned with the one-year subscription window. */
  private async syncSubscription(hub: {
    isPaid: boolean;
    paidAt?: Date | null;
    save: () => Promise<unknown>;
  }) {
    const active = this.subscriptionIsActive(hub);
    if (hub.isPaid !== active) {
      hub.isPaid = active;
      await hub.save();
    }
    return {
      isPaid: active,
      expiryDate: active ? this.subscriptionExpiry(hub.paidAt) : null,
    };
  }

  isValidObjectId(id: unknown): boolean {
    if (id == null) return false;
    const value = String(id).trim();
    return (
      /^[a-fA-F0-9]{24}$/.test(value) && mongoose.Types.ObjectId.isValid(value)
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

    if (
      newPassword.length < 7 ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      throw new BadRequestException(
        'Password must be at least 7 characters and include an uppercase letter, a number, and a special character',
      );
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

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return {
        statusCode: 400,
        message: 'Enter a valid email address',
        data: null,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Enter a valid email address',
        },
      };
    }

    if (!createHubDto.address?.trim()) {
      return {
        statusCode: 400,
        message: 'Address is required',
        data: null,
        error: {
          code: 'MISSING_ADDRESS',
          message: 'Address is required',
        },
      };
    }

    if (!/^\d{8}$/.test(digitsOnly(createHubDto.TIN))) {
      return {
        statusCode: 400,
        message: 'TIN must be 8 digits',
        data: null,
        error: {
          code: 'INVALID_TIN',
          message: 'TIN must be 8 digits',
        },
      };
    }

    this.logger.log('Looking for a hub with an existing email or phone');

    // Check fields independently so messages match the actual conflict
    const existingByEmail = await this.hubModel.findOne(
      this.emailQuery(normalizedEmail),
    );
    const existingByPhone = await this.hubModel.findOne({
      phone: { $in: phoneVariants },
    });

    const emailTaken = !!existingByEmail;
    const phoneTaken = !!existingByPhone;

    if (emailTaken || phoneTaken) {
      const conflicts = [
        ...(emailTaken ? ['email'] : []),
        ...(phoneTaken ? ['phone'] : []),
      ];

      const message =
        emailTaken && phoneTaken
          ? 'Hub with existing email or phone already exists'
          : emailTaken
            ? 'Email already exists, please use a different email'
            : 'Phone number already exists, please use a different number';

      response = {
        statusCode: 409,
        message,
        data: { conflicts },
        error: {
          code:
            emailTaken && phoneTaken
              ? 'HUB_ALREADY_EXIST'
              : emailTaken
                ? 'EMAIL_ALREADY_EXIST'
                : 'PHONE_ALREADY_EXIST',
          message,
        },
      };
    } else {
      this.logger.log(`uploading CAC and logo to cloud...`);
      const [CAC, logo] = await Promise.all([
        this.cloudinary.upload(createHubDto.CAC[0]),
        this.cloudinary.upload(createHubDto.logo[0]),
      ]);

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

      this.logger.log(`sending success email (background)`);
      dispatchMail('hub-register', () =>
        SuccessMail.mail(newHub.hubName, newHub.email),
      );

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
      const checked = validateApplicantFields({
        email,
        phoneNumber,
        NIN,
        D_O_B,
        gender: createUserDto.gender,
        role: createUserDto.role,
        start_date,
        end_date,
        requireMembershipDates: true,
      });
      if (checked.ok === false) {
        return {
          statusCode: 400,
          message: checked.message,
          data: null,
          error: null,
        };
      }

      const ninAsNumber = checked.nin;
      const age = checked.age;
      createUserDto.role = checked.role;

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
        phoneNumber: checked.phoneDigits,
        profilePic: profilePic.secure_url,
        start_date: String(start_date).slice(0, 10),
        end_date: String(end_date).slice(0, 10),
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

      const websiteUrl = 'https://devverify.pl.gov.ng/';

      const qrCodeData = await QRCode.toDataURL(websiteUrl);
      newUser.qrcode = qrCodeData;
      await newUser.save();

      this.logger.log(`Sending successful application email (background)`);
      dispatchMail('hub-create-user', () =>
        AcceptanceMail.mail(
          newUser.firstName,
          newUser.lastName,
          hub.hubName,
          newUser.userID,
          newUser.Stack,
          newUser.role,
          newUser.duration,
          newUser.email,
          newUser._id,
          newUser.createdAt,
          newUser.end_date,
        ),
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
      const subscription = await this.syncSubscription(hub);

      return {
        statusCode: 200,
        message: 'Login successful',
        data: {
          token,
          hub: {
            ...sanitizeDocument(hub),
            isPaid: subscription.isPaid,
            expiryDate: subscription.expiryDate,
          },
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error during sign-in: ${error.message}`);
      throw error;
    }
  }

  async getAllHubs() {
    try {
      const hubs = await this.hubModel.find().populate('hubs_users').lean();
      const withSubscription = (
        sanitizeDocument(hubs) as Array<Record<string, unknown>>
      ).map((hub) => {
        const paidAt = hub.paidAt as Date | string | null | undefined;
        const expiry = this.subscriptionExpiry(paidAt);
        const isPaid = expiry
          ? expiry.getTime() > Date.now()
          : hub.isPaid === true;
        return {
          ...hub,
          isPaid,
          expiryDate: isPaid ? expiry : null,
        };
      });
      return {
        statusCode: 200,
        message: 'Hubs retrieved successfully',
        data: withSubscription,
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

      dispatchMail('hub-verify', () =>
        VerifiedMail.mail(
          updatedHub.email,
          updatedHub.hubName,
          updatedHub.hubId,
        ),
      );

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

      const subscription = await this.syncSubscription(hub);

      return {
        statusCode: 200,
        message: 'Hub retrieved successfully',
        data: {
          ...sanitizeDocument(hub.toObject()),
          isPaid: subscription.isPaid,
          expiryDate: subscription.expiryDate,
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
      dispatchMail('hub-suspend', () =>
        SuspensionMail.mail(hubToSuspend.hubName, hubToSuspend.email),
      );

      return {
        statusCode: 200,
        message: 'Hub suspended successfully',
        data: sanitizeDocument(hubToSuspend),
        error: null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
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
      dispatchMail('hub-unsuspend', () =>
        UnSuspensionHubMail.mail(
          hubToUnsuspend.hubName,
          hubToUnsuspend.email,
        ),
      );

      return {
        statusCode: 200,
        message: 'Hub unsuspended successfully',
        data: sanitizeDocument(hubToUnsuspend),
        error: null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
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

      const rangeError = membershipDateError(start_date, end_date);
      if (rangeError) {
        return {
          statusCode: 400,
          message: rangeError,
          data: null,
          error: null,
        };
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      const duration = this.calculateDurationInMonths(startDate, endDate);

      const userID = generateUserID(role);

      user.duration = duration;
      user.start_date = String(start_date).slice(0, 10);
      user.end_date = String(end_date).slice(0, 10);
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

      dispatchMail('user-approve', () =>
        AcceptanceMail.mail(
          firstName,
          lastName,
          hub.hubName,
          user.userID,
          Stack,
          role,
          duration,
          email,
          user._id?.toString?.() ?? user._id,
          user.createdAt,
          user.end_date,
        ),
      );

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

    if (!interviewDto.interviewDate || !interviewDto.interviewTime) {
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

      dispatchMail('interview-schedule', () =>
        InterviewMail.mail(
          user.email,
          user.firstName,
          user.lastName,
          interviewDto.interviewDate,
          interviewDto.interviewTime,
          interviewLocation,
        ),
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

      const [hubExists, usersUnderHub] = await Promise.all([
        this.hubModel.exists({ _id: hubId }),
        this.userModel.find({ hub: hubId }).lean(),
      ]);

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
      const canonical = canonicalPersonnelRole(role);
      const users = await this.userModel
        .find({ role: canonical || role, hub: hubId })
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
    actor: { _id: unknown; role?: string },
  ) {
    if (
      normalizeAccountRole(actor?.role) === 'hub' &&
      String(actor._id) !== String(hubId)
    ) {
      throw new ForbiddenException(
        'You can only update your own hub subscription',
      );
    }

    const { isPaid } = updatePaidStatusDto;
    const hub = await this.hubModel.findById(hubId);

    if (!hub) {
      throw new NotFoundException('Hub not found');
    }

    if (isPaid) {
      hub.isPaid = true;
      hub.paidAt = new Date();
    } else {
      hub.isPaid = false;
      hub.paidAt = undefined;
    }
    await hub.save();

    const subscriptionExpiry = hub.isPaid
      ? this.subscriptionExpiry(hub.paidAt)
      : null;

    dispatchMail('hub-payment-status', () =>
      SubscriptionStatusMail.mail(
        hub.hubName,
        hub.email,
        hub.isPaid,
        hub._id,
        hub.createdAt,
        subscriptionExpiry,
      ),
    );

    return {
      statusCode: 200,
      message: 'Hub payment status updated successfully',
      data: {
        ...sanitizeDocument(hub),
        isPaid: hub.isPaid,
        expiryDate: hub.isPaid ? this.subscriptionExpiry(hub.paidAt) : null,
      },
      error: null,
    };
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

    const subscription = await this.syncSubscription(hub);

    return {
      statusCode: 200,
      message: 'Hub details retrieved successfully',
      data: {
        hub: {
          ...sanitizeDocument(hub.toObject()),
          isPaid: subscription.isPaid,
          expiryDate: subscription.expiryDate,
        },
        users: hubUsers,
      },
      error: null,
    };
  }
}
