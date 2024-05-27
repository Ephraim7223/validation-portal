import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';

export class InterviewMail {
  static async mail(
    email: string,
    firstName: string,
    lastName: string,
    interviewDate: any,
    interviewTime: string,
    interviewLocation: string,
  ) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${firstName} ${lastName}`,
        intro: [
          `Congratulations! We are pleased to inform you of your interview.`,
          `<h2>Interview Details</h2>`,
          `Date: ${interviewDate}`,
          `Time: ${interviewTime}`,
          `Location: ${interviewLocation}`,
        ],
        outro: [
          "For further assistance and enquiries about your organization's activities, please do not hesitate to contact us.",
        ],
      },
    };

    const template = mailGenerator.generate(html);
    const mail = {
      to: email,
      subject: 'Invitation for Interview!',
      from: process.env.GMAIL_NAME,
      html: template,
    };

    return mailTransport(mail.from, mail.to, mail.subject, mail.html);
  }
}
