import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class ExpiryMail {
  static async mail(hubName: string, remainingDays: number, email: string) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${hubName}`,
        intro: [
          `We are writing to inform you that your account with placdevportal has been suspended.`,
          `You have ${remainingDays} till suspension`,
          `If you have any questions or need further assistance, please contact us at .`,
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Account Expiry Notification',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
