import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateTradeInDto {
  @IsString()
  deviceName: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  condition: string;

  @IsNumber()
  offeredPrice: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imei?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  storageSize?: string;
} 