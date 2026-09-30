import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class SuspensionMail {
  static async mail(hubName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Account',
      title: 'Your hub has been suspended',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your hub account has been suspended. You will not be able to manage members until it is restored.',
        'Reply to this email if you believe this was a mistake or you need help restoring the account.',
      ],
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub account has been suspended',
      html,
    );
  }
}
