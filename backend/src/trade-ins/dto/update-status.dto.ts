import { IsString, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  adminNote?: string;
} 