import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CheckoutItemDto {
  @IsString()
  name: string;

  @IsArray()
  images: string[];

  @IsString()
  price: number;

  @IsString()
  quantity: number;
}

export class CreateCheckoutSessionDto {
  @IsString()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
} 