import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  private readonly allowedFileExtensions = ['pdf', 'jpg', 'png', 'jpeg', 'svg'];
  private readonly maxFileSizeBytes = 5 * 1024 * 1024; // 5MB

  transform(value: Express.Multer.File): Express.Multer.File {
    if (!value || typeof value !== 'object') {
      return value;
    }

    for (const files of Object.values(value as unknown as Record<string, Express.Multer.File[]>)) {
      if (!Array.isArray(files) || !files[0]) continue;

      const file = files[0];
      if (!this.validateFileExtension(file.originalname)) {
        throw new BadRequestException({
          message: `Invalid file extension detected, possible file extensions are: [${this.allowedFileExtensions}]`,
        });
      }

      if (file.size && file.size > this.maxFileSizeBytes) {
        throw new BadRequestException({
          message: `File too large. Maximum allowed size is ${this.maxFileSizeBytes / (1024 * 1024)}MB`,
        });
      }
    }

    return value;
  }

  private validateFileExtension(fileName: string): boolean {
    const extension = fileName.split('.').pop();
    if (!extension) return false;
    return this.allowedFileExtensions.includes(extension.toLowerCase());
  }
}
