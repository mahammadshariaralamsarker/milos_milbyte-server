import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { UploadFileDto } from './dto/deploy.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  @Post('upload-image')
  @ApiOperation({ summary: 'Upload an image and get a public link' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiBadRequestResponse({ description: 'Only image files are allowed' })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createUploadOptions(
        'images',
        ['image/jpeg', 'image/png', 'image/webp'],
        10 * 1024 * 1024,
      ),
    ),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return createUploadResponse(req, file, 'images');
  }
}

function createUploadOptions(
  folder: 'images' | 'documents' | 'profile-pictures',
  allowedMimeTypes: string[],
  maxSize: number,
) {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', folder);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname || '').toLowerCase()}`;
        cb(null, safeName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(
          new BadRequestException(
            `Only ${folder === 'images' ? 'JPEG, PNG, and WEBP' : folder === 'documents' ? 'document' : 'image'} files are allowed`,
          ),
          false,
        );
        return;
      }

      cb(null, true);
    },
    limits: {
      fileSize: maxSize,
    },
  };
}

function createUploadResponse(
  req: Request,
  file: Express.Multer.File,
  folder: 'images' | 'documents' | 'profile-pictures',
) {
  if (!file) {
    throw new BadRequestException('File is required');
  }

  const protocol =
    (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  const relativePath = `/uploads/${folder}/${file.filename}`;

  return {
    success: true,
    data: {
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      url: `${baseUrl}${relativePath}`,
    },
  };
}
