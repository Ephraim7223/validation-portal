/* eslint-disable @typescript-eslint/no-var-requires */
import { mailTransport } from 'src/common/config';
import { mailGenerator } from '../common/config/mailgen';
// import { addImageWatermarkToPDF } from 'src/services';
// import { generateAcceptanceLetter } from 'src/services/acceptance-letter-generator';
// const fs = require('fs');
// const path = require('path');

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
          `Click on this link to get your ID card: https://pdcvp.netlify.app/print-id/${_id}`,
        ],
        outro: [
          'For further assistance and enquiries about your organisation`s activities, please do not hesitate to contact us.',
        ],
      },
    };
    const template = mailGenerator.generate(html);

    // const acceptancePath = await generateAcceptanceLetter(
    //   firstName,
    //   lastName,
    //   userID,
    //   Stack,
    //   hub,
    //   role,
    // );
    // const watermarkedPath = path.join(__dirname, 'acceptance-water.pdf');
    // await addImageWatermarkToPDF(
    //   acceptancePath,
    //   watermarkedPath,
    //   path.join(__dirname, 'logo.png'),
    // );

    // const attachments = [
    //   {
    //     filename: `${firstName} ${lastName}-acceptance.pdf`,
    //     path: watermarkedPath,
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
