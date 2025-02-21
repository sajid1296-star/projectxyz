import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    private productsService: ProductsService,
  ) {}

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartModel.findOne({ userId });
    
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    
    return cart.populate('items.productId');
  }

  async addToCart(userId: string, productId: string, quantity: number): Promise<Cart> {
    const product = await this.productsService.findOne(productId);
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }

    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price,
        discountPrice: product.discountPrice,
      });
    }

    cart.total = this.calculateTotal(cart.items);
    await cart.save();
    
    return cart.populate('items.productId');
  }

  async updateQuantity(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException('Warenkorb nicht gefunden');
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Produkt nicht im Warenkorb');
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    cart.total = this.calculateTotal(cart.items);
    await cart.save();
    
    return cart.populate('items.productId');
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((total, item) => {
      const price = item.discountPrice || item.price;
      return total + (price * item.quantity);
    }, 0);
  }
} 