import { mailTransport } from 'src/common/config/google-oauth-mail';
import { renderEmail } from './layout';

export class PasswordResetMail {
  static async sendOtp(email: string, otp: string, timeoutMinutes: number) {
    const html = renderEmail({
      eyebrow: 'Security',
      title: 'Reset your password',
      greeting: 'Hello,',
      paragraphs: [
        'Use this one-time code to choose a new password. Do not share it with anyone.',
      ],
      details: [
        { label: 'One-time code', value: otp },
        { label: 'Expires', value: `${timeoutMinutes} minutes` },
      ],
      note: 'If you did not ask to reset your password, ignore this email. Your password will stay the same.',
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your password reset code',
      html,
    );
  }
}
