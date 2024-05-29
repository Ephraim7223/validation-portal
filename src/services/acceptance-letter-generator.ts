/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit'; // Correct import for pdfkit
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const logger = new Logger();

export const generateAcceptanceLetter = async (
  firstName: string,
  lastName: string,
  userID: any,
  Stack: string,
  hub: string,
  role: string,
) => {
  logger.log(`initializing acceptance letter pdf generation...`);

  const doc = PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  });

  const stream = doc.pipe(fs.createWriteStream('acceptance.pdf'));
  const fontBold = 'Helvetica-Bold';
  const fontNormal = 'Helvetica';

  const logoPath = path.join(__dirname, 'logo.png'); // Adjust the path if necessary
  // const signatureImage = path.join('src/utils', 'signature.jpeg');
  // const sendingTime = new Date().toLocaleString().split(',')[0];

  logger.log(`generation started`);

  try {
    // Adding logo
    doc.image(logoPath, 50, 50, { width: 50 }).moveDown(1);

    // Adding profile picture placeholder
    doc.circle(300, 100, 50).stroke();
    doc
      .fontSize(12)
      .text(firstName + ' ' + lastName, 250, 170, { align: 'center' });
    doc.fontSize(10).text(hub, 250, 190, { align: 'center' });
    doc.fontSize(10).text(role, 250, 210, { align: 'center' });
    doc.fontSize(10).text(userID, 250, 230, { align: 'center' });

    // QR Code
    const qrCodeData = await QRCode.toDataURL(
      JSON.stringify({
        firstName,
        lastName,
        userID,
        Stack,
        hub,
        role,
      }),
    );
    const qrCodeImageBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
    doc.image(qrCodeImageBuffer, 250, 270, { width: 100, height: 100 });

    // Contact Information
    doc
      .fontSize(10)
      .text('Expiry date: 31-03-2025', 250, 380, { align: 'center' });
    doc
      .fontSize(10)
      .text('In case of loss, damage, or for enquiries, contact:', 50, 420, {
        align: 'center',
      });
    doc.fontSize(10).text('+234 903 983 0040', 250, 450, { align: 'center' });
    doc.fontSize(10).text('info@pictda.ng', 250, 470, { align: 'center' });

    // Footer
    doc.fontSize(10).text('An initiative of', 250, 500, { align: 'center' });
    doc.image(logoPath, 250, 520, { width: 50 });

    doc.end();
    const data = await stream;
    logger.log(`pdf generation completed, returning file as base64`);
    return data.toString('base64');
  } catch (err) {
    logger.log(`pdf generation failed:` + JSON.stringify(err, null, 2));
    return err;
  }
};
