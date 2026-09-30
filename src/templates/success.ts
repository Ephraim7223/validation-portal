import { mailTransport } from 'src/common/config';
import { portalUrl, renderEmail } from './layout';

export class SuccessMail {
  static async mail(hubName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Registration',
      title: 'Hub registration received',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your hub registration was received. An administrator will verify the account before you can sign in.',
        'You will get another email when the hub is verified, with your Hub ID and the next step.',
      ],
      button: { label: 'Visit the portal', href: portalUrl() },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Hub registration received',
      html,
    );
  }
}
