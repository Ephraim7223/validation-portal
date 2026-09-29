import { createTransport, Transporter } from 'nodemailer';
import { google } from 'googleapis';
import { Logger } from '@nestjs/common';

const logger = new Logger('GoogleMailConfig');

type MailEnv = {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URI: string;
  REFRESH_TOKEN: string;
  GMAIL_NAME: string;
};

function getMailEnv(): MailEnv {
  const {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    REFRESH_TOKEN,
    GMAIL_NAME,
  } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !GMAIL_NAME) {
    throw new Error(
      'Gmail OAuth env vars are incomplete (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, GMAIL_NAME)',
    );
  }

  return {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI:
      REDIRECT_URI || 'https://developers.google.com/oauthplayground',
    REFRESH_TOKEN,
    GMAIL_NAME,
  };
}

async function createFreshTransporter(): Promise<{
  transporter: Transporter;
  from: string;
}> {
  const env = getMailEnv();
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    env.CLIENT_ID,
    env.CLIENT_SECRET,
    env.REDIRECT_URI,
  );
  oauth2Client.setCredentials({ refresh_token: env.REFRESH_TOKEN });

  const tokenResponse = await oauth2Client.getAccessToken();
  const accessToken =
    typeof tokenResponse === 'string'
      ? tokenResponse
      : tokenResponse?.token || undefined;

  if (!accessToken) {
    throw new Error('Failed to obtain Gmail OAuth access token');
  }

  const transporter = createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: env.GMAIL_NAME,
      clientId: env.CLIENT_ID,
      clientSecret: env.CLIENT_SECRET,
      refreshToken: env.REFRESH_TOKEN,
      accessToken,
    },
    // Match the previously working Gmail relay behavior on hosts like Render
    tls: {
      rejectUnauthorized: false,
    },
  });

  return { transporter, from: env.GMAIL_NAME };
}

export const mailTransport = async (
  from: string,
  to: string,
  subject: string,
  html,
  attachments?,
) => {
  if (!to) {
    throw new Error('Mail recipient (to) is required');
  }

  logger.log(`sending mail to applicant with email: [${to}] subject=[${subject}]`);

  const { transporter, from: defaultFrom } = await createFreshTransporter();
  const sender = from || defaultFrom;

  try {
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
      attachments,
    });
    logger.log(
      `mail accepted for [${to}] messageId=${info?.messageId || 'n/a'}`,
    );
    return info;
  } finally {
    transporter.close();
  }
};
