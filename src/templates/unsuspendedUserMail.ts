import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class UserUnSuspensionMail {
  static async mail(
    firstName: string,
    lastName: string,
    hub: string,
    email: string,
  ) {
    const html = renderEmail({
      eyebrow: 'Membership',
      title: 'Your membership has been restored',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        `Your membership with ${hub} is active again.`,
        'Contact your hub if you still cannot use your ID.',
      ],
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your membership has been restored',
      html,
    );
  }
}
