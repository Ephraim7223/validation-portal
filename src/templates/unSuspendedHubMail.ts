import { mailTransport } from 'src/common/config';
import { portalUrl, renderEmail } from './layout';

export class UnSuspensionHubMail {
  static async mail(hubName: string, email: string) {
    const html = renderEmail({
      eyebrow: 'Account',
      title: 'Your hub has been restored',
      greeting: `Dear ${hubName},`,
      paragraphs: [
        'Your hub account is active again. You can sign in and continue managing members.',
      ],
      button: { label: 'Sign in', href: portalUrl('sign-in') },
    });

    return mailTransport(
      process.env.GMAIL_NAME,
      email,
      'Your hub account has been restored',
      html,
    );
  }
}
