// import { PDFDocument, rgb, degrees } from 'pdf-lib';
// import fs from 'fs';
// import path from 'path';

// export async function addImageWatermarkToPDF(
//   inputFilePath,
//   outputFilePath,
//   watermarkImagePath,
// ) {
//   const existingPdfBytes = await fs.promises.readFile(inputFilePath);
//   const pdfDoc = await PDFDocument.load(existingPdfBytes);
//   const page = pdfDoc.getPages()[0];

//   const watermarkImageBytes = await fs.promises.readFile(watermarkImagePath);
//   const watermarkImage = await pdfDoc.embedPng(watermarkImageBytes);

//   const imageWidth = watermarkImage.width;
//   const imageHeight = watermarkImage.height;

//   page.drawImage(watermarkImage, {
//     x: 290,
//     y: 120,
//     width: imageWidth,
//     height: imageHeight,
//     opacity: 0.2,
//     rotate: degrees(50),
//   });

//   const modifiedPdfBytes = await pdfDoc.save();
//   await fs.promises.writeFile(outputFilePath, modifiedPdfBytes);
// }
