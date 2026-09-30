import { mailTransport } from 'src/common/config';
import { portalUrl, renderEmail } from './layout';

export class VerifiedMail {
  static async mail(email: string, hubName: string, hubId: string) {
    const html = renderEmail({
      eyebrow: 'Verification',
      title: 'Your hub is verified',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your hub has been verified. Sign in with the Hub ID below. The first sign-in asks you to complete the yearly subscription.',
      ],
      details: [{ label: 'Hub ID', value: hubId }],
      button: { label: 'Sign in', href: portalUrl('sign-in') },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub has been verified',
      html,
    );
  }
}
