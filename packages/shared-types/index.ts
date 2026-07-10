export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR';
  mfaEnabled: boolean;
  createdAt: string;
}

export interface AuthResponseDto {
  token?: string;
  user?: UserDto;
  status: 'SUCCESS' | 'MFA_REQUIRED';
  mfaToken?: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'ZIP' | 'PROPOSAL' | 'INVOICE' | 'SPREADSHEET';
  status: 'DRAFT' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED';
  fileUrl?: string;
  companyId?: string;
  customerId?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}
