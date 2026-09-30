import { mailTransport } from 'src/common/config';
import { renderEmail } from './layout';

export class DeletedMail {
  static async mail(
    firstName: string,
    lastName: string,
    organisation: string,
    email: string,
  ) {
    const html = renderEmail({
      eyebrow: 'Account',
      title: 'Your membership record was removed',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        `Your record with ${organisation} has been deleted.`,
        'Contact the hub if you think this was a mistake.',
      ],
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your membership record was removed',
      html,
    );
  }
}
