import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';
import { PaymentsService } from '../payments/payments.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private productsService: ProductsService,
    private paymentsService: PaymentsService,
    private usersService: UsersService,
  ) {}

  async findAll(query: any = {}) {
    const { status, userId, ...rest } = query;
    
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('order.user.id = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }

    return order;
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const user = await this.usersService.findOne(userId);

    // Überprüfe Produkte und berechne Gesamtsumme
    let total = 0;
    const orderItems = [];

    for (const item of createOrderDto.items) {
      const product = await this.productsService.findOne(item.productId);
      
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Nicht genügend Lagerbestand für ${product.name}`);
      }

      total += product.price * item.quantity;
      orderItems.push({
        product,
        quantity: item.quantity,
        price: product.price,
      });

      // Aktualisiere Lagerbestand
      await this.productsService.updateStock(product.id, -item.quantity);
    }

    // Erstelle Payment Intent
    const paymentIntent = await this.paymentsService.createPaymentIntent(total);

    // Erstelle Bestellung
    const order = this.ordersRepository.create({
      user,
      total,
      status: 'pending',
      shippingAddress: createOrderDto.shippingAddress,
      paymentIntentId: paymentIntent.id,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Speichere Bestellpositionen
    for (const item of orderItems) {
      await this.orderItemsRepository.save({
        order: savedOrder,
        ...item,
      });
    }

    return this.findOne(savedOrder.id);
  }

  async updateStatus(id: string, status: string) {
    const order = await this.findOne(id);
    
    if (status === 'paid' && order.status !== 'paid') {
      order.paidAt = new Date();
    }
    
    order.status = status;
    return this.ordersRepository.save(order);
  }

  async handlePaymentSuccess(paymentIntentId: string) {
    const order = await this.ordersRepository.findOne({
      where: { paymentIntentId },
    });

    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }

    return this.updateStatus(order.id, 'paid');
  }
} 