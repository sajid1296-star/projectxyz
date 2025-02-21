import { PartialType } from '@nestjs/mapped-types';
import { CreateTradeInDto } from './create-trade-in.dto';

export class UpdateTradeInDto extends PartialType(CreateTradeInDto) {} 