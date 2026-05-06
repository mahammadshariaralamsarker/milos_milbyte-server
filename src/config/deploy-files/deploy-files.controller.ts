import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
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
  private readonly logger = new Logger(FilesController.name);

  @Post('upload')
  @ApiOperation({ summary: 'Upload image or PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createUploadOptions(
        'documents',
        ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        20 * 1024 * 1024,
      ),
    ),
  )
  uploadAny(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    this.logger.log(`File upload request: ${file?.originalname}`);
    return createUploadResponse(req, file, 'documents');
  }
}

// ================= HELPER FUNCTIONS =================

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
        const ext = extname(file.originalname || '').toLowerCase();

        const safeName = `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}${ext}`;

        cb(null, safeName);
      },
    }),

    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(
          new BadRequestException(
            'Invalid file type. Allowed: JPEG, PNG, WEBP, PDF',
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
  folder: 'images' | 'documents',
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
    message: 'File uploaded successfully',
    data: {
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      url: `${baseUrl}${relativePath}`,
    },
  };
}
