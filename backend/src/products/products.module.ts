import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from '../entities/product.entity';
import { CloudStorageModule } from '../cloud-storage/cloud-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CloudStorageModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {} 