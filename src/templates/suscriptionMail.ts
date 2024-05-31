import { mailTransport } from 'src/common/config';
import { mailGenerator } from 'src/common/config/mailgen';

export class SubscriptionStatusMail {
  static async mail(hubName: string, email: string, isPaid: boolean, _id: any) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${hubName}`,
        intro: [
          `We are writing to inform you that your subscription status has been updated.`,
          `Your current subscription status is: ${isPaid ? 'Active' : 'Inactive'}.`,
          `You have subscribed for a yearly usage.`,
          `You can now access your dashboard to manage your hub's details and activities.`,
          `If you have any questions or need further assistance, please contact us.`,
          `Click on the link to download your certificate: https://pdcvp.netlify.app/print-certificate/${_id}`,
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Subscription Status Update',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
