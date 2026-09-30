import { mailTransport } from 'src/common/config';
import { portalUrl, renderEmail } from './layout';

export class SubscriptionExpiryMail {
  static async mail(hubName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Subscription',
      title: 'Your subscription has expired',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your yearly hub subscription has ended. Renew it to continue using the dashboard.',
      ],
      button: { label: 'Open the portal', href: portalUrl('sign-in') },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub subscription has expired',
      html,
    );
  }
}
