import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  private readonly allowedFileExtensions = ['pdf', 'jpg', 'png', 'jpeg', 'svg'];

  transform(value: Express.Multer.File): Express.Multer.File {
    for (let index = 0; index < Object.keys(value).length; index++) {
      if (
        !this.validateFileExtension(Object.values(value)[index][0].originalname)
      ) {
        throw new BadRequestException({
          message: `Invalid file extension detected, possible file extensions are: [${this.allowedFileExtensions}]`,
        });
      }
    }
    return value;
  }

  private validateFileExtension(fileName: string): boolean {
    const extension = fileName.split('.').pop();
    return this.allowedFileExtensions.includes(extension.toLowerCase());
  }
}
