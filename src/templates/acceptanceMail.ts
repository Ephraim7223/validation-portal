/* eslint-disable @typescript-eslint/no-var-requires */
import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';
// import { addImageWatermarkToPDF } from 'src/services';
// import { generateAcceptanceLetter } from 'src/services/acceptance-letter-generator';
// const fs = require('fs');

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
  ) {
    const html = {
      body: {
        signature: false,
        greeting: `Dear ${firstName} ${lastName}`,
        intro: [
          `Congratulations! We are pleased to inform you of your acceptance into ${hub}.`,
          `Your ID number is: <b>${userID}</b>`,
          `<h2>Application Details</h2>`,
          `Chosen Stack: ${Stack}`,
          `Registered Role: ${role}`,
          `For a duration of ${duration} months`,
        ],
        outro: [
          'For further assistance and enquiries about your organisation`s activities, please do not hesitate to contact us.',
        ],
      },
    };
    const template = mailGenerator.generate(html);
    // const acceptanceBase64 = await generateAcceptanceLetter(
    //   firstName,
    //   lastName,
    //   hub,
    //   userID,
    //   Stack,
    //   role,
    // );

    // await fs.writeFileSync(
    //   'acceptance.pdf',
    //   Buffer.from(acceptanceBase64, 'base64'),
    // );
    // addImageWatermarkToPDF(
    //   'acceptance.pdf',
    //   'acceptance-water.pdf',
    //   'src/utils/foundation.png',
    // );

    // const attachments = [
    //   {
    //     filename: `${firstName} + ${lastName}-acceptance.pdf`,
    //     path: 'acceptance-water.pdf',
    //   },
    // ];
    const mail = {
      to: email,
      subject: 'Congratulations on Your Acceptance!',
      from: process.env.GMAIL_NAME,
      html: template,
    };
    return mailTransport(
      mail.from,
      mail.to,
      mail.subject,
      mail.html,
      // attachments,
    );
  }
}
