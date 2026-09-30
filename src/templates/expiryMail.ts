import { mailTransport } from 'src/common/config';
import { portalUrl, renderEmail } from './layout';

export class ExpiryMail {
  static async mail(hubName: string, remainingDays: number, email: string) {
    const html = renderEmail({
      eyebrow: 'Subscription',
      title: 'Your subscription is ending soon',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        `Your hub subscription will lapse in ${remainingDays} day${remainingDays === 1 ? '' : 's'}. Renew it to keep managing members.`,
      ],
      details: [
        {
          label: 'Time left',
          value: `${remainingDays} day${remainingDays === 1 ? '' : 's'}`,
        },
      ],
      button: { label: 'Open the portal', href: portalUrl('sign-in') },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub subscription is ending soon',
      html,
    );
  }
}
