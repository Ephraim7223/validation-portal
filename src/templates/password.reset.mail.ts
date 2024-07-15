import { mailTransport } from 'src/common/config/google-oauth-mail';
import { mailGenerator } from 'src/common/config/mailgen';

export class PasswordResetMail {
  static async sendOtp(email: string, otp: string, timeoutMinutes: number) {
    const timeoutMessage = `This OTP is valid for ${timeoutMinutes} minutes.`;

    const html = {
      body: {
        signature: false,
        greeting: 'Dear User',
        intro: [
          `Your OTP for password reset is <div style="background-color: #f0f0f0; padding: 10px; display: inline-block;"><b>${otp}</b></div>.`,
          'Please use this OTP to proceed with resetting your password.',
          `<p>${timeoutMessage}</p>`,
        ],
        outro: [
          'If you did not request this OTP, please ignore this email.',
          'For further assistance, please contact our support team.',
        ],
      },
    };

    const template = mailGenerator.generate(html);

    const mail = {
      to: email,
      subject: 'Password Reset OTP',
      from: process.env.GMAIL_NAME,
      html: template,
    };

    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
