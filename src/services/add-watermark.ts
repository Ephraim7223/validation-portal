/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
import { PDFDocument, rgb, degrees } from 'pdf-lib';
const fs = require('fs').promises;

export async function addImageWatermarkToPDF(
  inputFilePath,
  outputFilePath,
  watermarkImagePath,
) {
  try {
    // Read the existing PDF file
    const existingPdfBytes = await fs.readFile(inputFilePath);

    // Load the existing PDF document
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the first page of the PDF
    const [page] = pdfDoc.getPages();

    // Load the image to be used as a watermark
    const watermarkImageBytes = await fs.readFile(watermarkImagePath);

    // Embed the watermark image
    const watermarkImage = await pdfDoc.embedPng(watermarkImageBytes);

    // Get the dimensions of the watermark image
    const { width: imageWidth, height: imageHeight } = watermarkImage;

    // Add the watermark image to the page
    page.drawImage(watermarkImage, {
      x: page.getWidth() / 2 - imageWidth / 2,
      y: page.getHeight() / 2 - imageHeight / 2,
      width: imageWidth,
      height: imageHeight,
      opacity: 0.2,
      rotate: degrees(50), // Rotate the watermark if desired
    });

    // Serialize the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Write the modified PDF to a new file
    await fs.writeFile(outputFilePath, modifiedPdfBytes);

    console.log(`Watermark added successfully to ${outputFilePath}`);
  } catch (error) {
    console.error('Error adding watermark:', error);
  }
}
