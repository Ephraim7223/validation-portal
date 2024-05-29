// import { Logger } from '@nestjs/common';
// import PDFDocument from 'pdfkit';
// import fs from 'fs';
// import path from 'path';
// import QRCode from 'qrcode';

// const logger = new Logger('PDFGenerator');

// export const generateAcceptanceLetter = async (
//   firstName: string,
//   lastName: string,
//   userID: string,
//   Stack: string,
//   hub: string,
//   role: string,
// ) => {
//   logger.log('Initializing acceptance letter PDF generation...');

//   const doc = new PDFDocument({
//     size: 'A4',
//     margins: {
//       top: 50,
//       bottom: 50,
//       left: 50,
//       right: 50,
//     },
//   });

//   const pdfPath = path.join(__dirname, 'acceptance.pdf');
//   const stream = fs.createWriteStream(pdfPath);
//   doc.pipe(stream);

//   const fontBold = 'Helvetica-Bold';
//   const fontNormal = 'Helvetica';
//   const logoPath = path.join(__dirname, 'logo.png');

//   logger.log(`Generating PDF at path: ${pdfPath}`);
//   logger.log(`Using logo at path: ${logoPath}`);

//   try {
//     doc.image(logoPath, 50, 50, { width: 50 }).moveDown(1);
//     doc.circle(300, 100, 50).stroke();
//     doc
//       .fontSize(12)
//       .text(`${firstName} ${lastName}`, 250, 170, { align: 'center' });
//     doc.fontSize(10).text(hub, 250, 190, { align: 'center' });
//     doc.fontSize(10).text(role, 250, 210, { align: 'center' });
//     doc.fontSize(10).text(userID, 250, 230, { align: 'center' });

//     const qrCodeData = await QRCode.toDataURL(
//       JSON.stringify({
//         firstName,
//         lastName,
//         userID,
//         Stack,
//         hub,
//         role,
//       }),
//     );

//     logger.log('QR Code generated successfully');

//     const qrCodeImageBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
//     doc.image(qrCodeImageBuffer, 250, 270, { width: 100, height: 100 });

//     doc
//       .fontSize(10)
//       .text('Expiry date: 31-03-2025', 250, 380, { align: 'center' });
//     doc
//       .fontSize(10)
//       .text('In case of loss, damage, or for enquiries, contact:', 50, 420, {
//         align: 'center',
//       });
//     doc.fontSize(10).text('+234 903 983 0040', 250, 450, { align: 'center' });
//     doc.fontSize(10).text('info@pictda.ng', 250, 470, { align: 'center' });
//     doc.fontSize(10).text('An initiative of', 250, 500, { align: 'center' });
//     doc.image(logoPath, 250, 520, { width: 50 });

//     doc.end();

//     await new Promise((resolve) => stream.on('finish', resolve));
//     logger.log('PDF generation completed successfully');

//     return pdfPath;
//   } catch (err) {
//     logger.error(`PDF generation failed: ${err.message}`, err.stack);
//     throw err;
//   }
// };
