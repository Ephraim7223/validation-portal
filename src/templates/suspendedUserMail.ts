import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class UserSuspensionMail {
  static async mail(
    firstName: string,
    lastName: string,
    hub: string,
    email: string,
  ) {
    const html = renderEmail({
      eyebrow: 'Membership',
      title: 'Your membership has been suspended',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        `Your membership with ${hub} has been suspended until further notice.`,
        'Contact your hub if you need this reviewed.',
      ],
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your membership has been suspended',
      html,
    );
  }
}
