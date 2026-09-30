import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class DeletedHubMail {
  static async mail(hubName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Account',
      title: 'Your hub account was removed',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your hub account has been deleted and can no longer be used to sign in.',
        'Reply to this email if you need this reviewed.',
      ],
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub account was removed',
      html,
    );
  }
}
