import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure the local uploads directory exists
const uploadPath = join(process.cwd(), 'uploads');
if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

@Controller()
@UseGuards(JwtAuthGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ==========================================
  // CURRENCIES CRUD
  // ==========================================

  @Get('currencies')
  async findAllCurrencies() {
    return this.masterDataService.findAllCurrencies();
  }

  @Post('currencies')
  async createCurrency(@Body() body: any) {
    return this.masterDataService.createCurrency(body);
  }

  @Put('currencies/:id')
  async updateCurrency(@Param('id') id: string, @Body() body: any) {
    return this.masterDataService.updateCurrency(id, body);
  }

  @Delete('currencies/:id')
  async removeCurrency(@Param('id') id: string) {
    return this.masterDataService.removeCurrency(id);
  }

  // ==========================================
  // PAYMENT TERMS CRUD
  // ==========================================

  @Get('payment-terms')
  async findAllPaymentTerms() {
    return this.masterDataService.findAllPaymentTerms();
  }

  @Post('payment-terms')
  async createPaymentTerm(@Body() body: any) {
    return this.masterDataService.createPaymentTerm(body);
  }

  @Put('payment-terms/:id')
  async updatePaymentTerm(@Param('id') id: string, @Body() body: any) {
    return this.masterDataService.updatePaymentTerm(id, body);
  }

  @Delete('payment-terms/:id')
  async removePaymentTerm(@Param('id') id: string) {
    return this.masterDataService.removePaymentTerm(id);
  }

  // ==========================================
  // DOCUMENT NUMBERINGS CONFIGS
  // ==========================================

  @Get('numberings')
  async findAllNumberings() {
    return this.masterDataService.findAllNumberings();
  }

  @Post('numberings')
  async createOrUpdateNumbering(@Body() body: any) {
    return this.masterDataService.createOrUpdateNumbering(body);
  }

  // ==========================================
  // NOTE LOGGING
  // ==========================================

  @Get('notes')
  async findNotes(
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.masterDataService.findNotesForEntity(companyId, customerId);
  }

  @Post('notes')
  async createNote(@Body() body: any) {
    return this.masterDataService.createNote(body);
  }

  @Delete('notes/:id')
  async removeNote(@Param('id') id: string) {
    return this.masterDataService.removeNote(id);
  }

  // ==========================================
  // TAGS CATEGORIZATION
  // ==========================================

  @Get('tags')
  async findAllTags(@Query('entityType') entityType?: string) {
    return this.masterDataService.findAllTags(entityType);
  }

  @Post('tags')
  async createTag(@Body() body: any) {
    return this.masterDataService.createTag(body);
  }

  @Delete('tags/:id')
  async removeTag(@Param('id') id: string) {
    return this.masterDataService.removeTag(id);
  }

  // ==========================================
  // ATTACHMENTS REGISTRY & UPLOADS
  // ==========================================

  @Get('attachments')
  async findAttachments(
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.masterDataService.findAttachmentsForEntity(companyId, customerId);
  }

  @Post('attachments/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Body('companyId') companyId?: string,
    @Body('customerId') customerId?: string,
  ) {
    // Register file metadata in DB attachment catalog
    return this.masterDataService.createAttachment({
      filename: file.originalname,
      filepath: `/uploads/${file.filename}`,
      mimetype: file.mimetype,
      sizeBytes: file.size,
      uploaderId: 'system-user',
      companyId: companyId || undefined,
      customerId: customerId || undefined,
    });
  }

  @Delete('attachments/:id')
  async removeAttachment(@Param('id') id: string) {
    return this.masterDataService.removeAttachment(id);
  }
}
