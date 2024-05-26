import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class UserUnSuspensionMail {
  static async mail(
    firstName: string,
    lastName: string,
    organisation: string,
    email: string,
  ) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${firstName} ${lastName}`,
        intro: [
          `We are writing to inform you that your account with ${organisation} has been reactivated.`,
          `If you have any questions or need further assistance, please contact us at .`,
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Account Reactivation Notification',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
