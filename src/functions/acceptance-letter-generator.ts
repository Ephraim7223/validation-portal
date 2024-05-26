// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// export async function generateAcceptanceLetter(
//   firstName: string,
//   lastName: string,
//   role: string,
//   userID: string,
//   // organisation: string,
// ): Promise<string> {
//   const pdfDoc = await PDFDocument.create();
//   const page = pdfDoc.addPage();

//   const { width, height } = page.getSize();
//   const fontSize = 12;

//   page.drawText(`Dear ${firstName} ${lastName},`, {
//     x: 50,
//     y: height - 100,
//     size: fontSize,
//     font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//     color: rgb(0, 0, 0), // Black color
//   });

//   page.drawText(
//     `Congratulations, we are glad to inform you of your acceptance into ${role}.`,
//     {
//       x: 50,
//       y: height - 130,
//       size: fontSize,
//       font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//       color: rgb(0, 0, 0), // Black color
//     },
//   );

//   page.drawText(`Your user ID number is ${userID}.`, {
//     x: 50,
//     y: height - 160,
//     size: fontSize,
//     font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//     color: rgb(0, 0, 0), // Black color
//   });

//   page.drawText(`Resumption Requirements:`, {
//     x: 50,
//     y: height - 190,
//     size: fontSize,
//     font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
//     color: rgb(0, 0, 0), // Black color
//   });

//   page.drawText(
//     `- A functioning laptop PC meeting the minimum requirements of your selected track.`,
//     {
//       x: 50,
//       y: height - 220,
//       size: fontSize,
//       font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//       color: rgb(0, 0, 0), // Black color
//     },
//   );

//   page.drawText(`- A data/network access mean.`, {
//     x: 50,
//     y: height - 250,
//     size: fontSize,
//     font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//     color: rgb(0, 0, 0), // Black color
//   });

//   page.drawText(
//     `- Payment receipt for your internship fee. See payment details below.`,
//     {
//       x: 50,
//       y: height - 280,
//       size: fontSize,
//       font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//       color: rgb(0, 0, 0), // Black color
//     },
//   );

//   // Save the PDF document to a buffer
//   const pdfBytes = await pdfDoc.save();

//   // Convert the PDF buffer to a Base64-encoded string
//   const acceptanceBase64 = pdfBytes.toString();

//   return acceptanceBase64;
// }
