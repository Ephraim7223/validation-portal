import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class VerifiedMail {
  static async mail(email: string, hubName: string, hubId: string) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${hubName}`,
        intro: [
          `Congratulations! Your hub has been successfully verified.`,
          `Please note that you will be redirected to a payment page during your first login to complete your subscription.`,
          `Your Hub ID: ${hubId}`,
          'You can now login to your dashboard.',
        ],
        outro: [
          'For any assistance or queries, please feel free to contact us.',
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Hub Verification Successful',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
