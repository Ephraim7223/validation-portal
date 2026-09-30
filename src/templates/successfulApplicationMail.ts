import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class ApplicationMail {
  static async mail(firstName: string, lastName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Application',
      title: 'Application received',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        'Your application has been sent to the hub. They will review it and contact you if an interview is needed.',
        'You will receive another email when a decision is made.',
      ],
      note: 'If you did not submit this application, you can ignore this message.',
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your application was received',
      html,
    );
  }
}
