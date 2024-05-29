import { mailTransport } from 'src/common/config';
import { mailGenerator } from 'src/common/config/mailgen';

export class SubscriptionExpiryMail {
  static async mail(hubName: string, email: string) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${hubName}`,
        intro: [
          `We are writing to inform you that your subscription has expired.`,
          `Your subscription for a yearly usage has ended.`,
          `You can renew your subscription to continue accessing your dashboard.`,
          `If you have any questions or need further assistance, please contact us at info@pitda.ng.`,
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Subscription Expiry Notification',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
