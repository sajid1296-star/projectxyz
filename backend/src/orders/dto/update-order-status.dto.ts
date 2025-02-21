import { IsString, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])
  status: string;
} 