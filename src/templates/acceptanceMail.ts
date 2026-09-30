import { mailTransport } from 'src/common/config';
import { formatMailDate, portalUrl, renderEmail } from './layout';

export class AcceptanceMail {
  static async mail(
    firstName: string,
    lastName: string,
    hub: any,
    userID: string,
    Stack: string,
    role: string,
    duration: any,
    email: string,
    _id: any,
    registeredAt?: Date | string | null,
    expiresAt?: Date | string | null,
  ) {
    const html = renderEmail({
      eyebrow: 'Membership',
      title: 'You have been accepted',
      greeting: `Dear ${firstName} ${lastName},`,
      paragraphs: [
        `Your application to ${hub} has been approved. Your ID card is ready to download.`,
      ],
      details: [
        { label: 'ID number', value: String(userID) },
        { label: 'Hub', value: String(hub) },
        { label: 'Role', value: String(role) },
        { label: 'Tech stack', value: String(Stack) },
        { label: 'Duration', value: `${duration} months` },
        { label: 'Registration date', value: formatMailDate(registeredAt) },
        { label: 'Expiry date', value: formatMailDate(expiresAt) },
      ],
      button: {
        label: 'Download ID card',
        href: portalUrl(`print-id/${_id}`),
      },
      note: 'Keep this ID number. Your hub can help if you need a new copy of the card.',
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Congratulations on your acceptance',
      html,
    );
  }
}
