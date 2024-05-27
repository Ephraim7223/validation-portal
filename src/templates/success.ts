import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class SuccessMail {
  static async mail(hubName: string, email: string) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${hubName}`,
        intro: [
          `Registration Successful Please wait for verification before logging in.`,
        ],
        outro: [
          'For further assistance and enquiries about your organisation`s activities, please do not hesitate to contact us.',
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Congratulations on Your Registration!',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
