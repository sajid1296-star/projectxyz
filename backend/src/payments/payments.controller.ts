import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto) {
    return this.paymentsService.createPaymentSession(
      createCheckoutSessionDto.orderId,
      createCheckoutSessionDto.items,
      createCheckoutSessionDto.successUrl,
      createCheckoutSessionDto.cancelUrl,
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const event = await this.paymentsService.constructEventFromPayload(
      signature,
      request.rawBody,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Verarbeite erfolgreiche Zahlung
        break;
      case 'payment_intent.payment_failed':
        // Verarbeite fehlgeschlagene Zahlung
        break;
    }

    return { received: true };
  }
} 