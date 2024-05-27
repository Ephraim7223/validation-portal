import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class ApplicationMail {
  static async mail(
    firstName: string,
    lastName: string,
    // role: string,
    // userID: string,
    email: string,
    // organisation: string,
    // duration: string,
  ) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${firstName} ${lastName}`,
        intro: [
          `Congratulations! We are pleased to inform you that your application request was sent , please be patient while we verify your application`,
          //   `Your ID number is: <b>${userID}</b>`,
          //   `<h2>Application Details</h2>`,
          //   `Registered Role: ${role}`,
          //   `For a duration of ${duration} months`,
        ],
        outro: [
          'For further assistance and enquiries about your organisation`s activities, please do not hesitate to contact us.',
        ],
      },
    };
    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Congratulations on Your Application!',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
