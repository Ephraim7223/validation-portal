import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class InterviewMail {
  static async mail(
    email: string,
    firstName: string,
    lastName: string,
    interviewDate: any,
    interviewTime: string,
    interviewLocation: string,
  ) {
    const html = renderEmail({
      eyebrow: 'Interview',
      title: 'Your interview is scheduled',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        'The hub has scheduled an interview for your application. Please arrive at the time below.',
      ],
      details: [
        { label: 'Date', value: String(interviewDate ?? '') },
        { label: 'Time', value: interviewTime || 'To be confirmed' },
        { label: 'Location', value: interviewLocation || 'To be confirmed' },
      ],
      note: 'Contact your hub if you need to change the time.',
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your interview has been scheduled',
      html,
    );
  }
}
