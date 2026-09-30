import { mailTransport } from 'src/common/config';
import { formatMailDate, portalUrl, renderEmail } from './layout';

export class SubscriptionStatusMail {
  static async mail(
    hubName: string,
    email: string,
    isPaid: boolean,
    _id: any,
    registeredAt?: Date | string | null,
    expiresAt?: Date | string | null,
  ) {
    const html = renderEmail({
      eyebrow: 'Subscription',
      title: isPaid ? 'Your subscription is active' : 'Your subscription is inactive',
      greeting: `Dear ${hubName},`,
      paragraphs: isPaid
        ? [
            'Your hub subscription is active for one year. You can manage members from your dashboard, and your registration certificate is ready.',
          ]
        : [
            'Your hub subscription is inactive. Renew it from the dashboard to keep managing members.',
          ],
      details: [
        { label: 'Status', value: isPaid ? 'Active' : 'Inactive' },
        { label: 'Plan', value: 'Yearly hub subscription' },
        { label: 'Registration date', value: formatMailDate(registeredAt) },
        { label: 'Expiry date', value: formatMailDate(expiresAt) },
      ],
      button: isPaid
        ? {
            label: 'Download certificate',
            href: portalUrl(`print-certificate/${_id}`),
          }
        : {
            label: 'Open the portal',
            href: portalUrl(),
          },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      isPaid ? 'Your hub subscription is active' : 'Your hub subscription is inactive',
      html,
    );
  }
}
