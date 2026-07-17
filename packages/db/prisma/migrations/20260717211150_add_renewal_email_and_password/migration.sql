-- AlterTable
ALTER TABLE `company_brandings` MODIFY `logoUrl` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `document_blocks` MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `document_versions` MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `documents` ADD COLUMN `accentColor` VARCHAR(191) NULL,
    ADD COLUMN `fontFamily` VARCHAR(191) NULL,
    ADD COLUMN `showStamp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `showWatermark` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `templateId` VARCHAR(191) NULL,
    ADD COLUMN `watermarkText` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `renewals` ADD COLUMN `emailId` VARCHAR(191) NULL,
    ADD COLUMN `password` VARCHAR(191) NULL;
