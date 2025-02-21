import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudStorageService } from '../cloud-storage/cloud-storage.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private cloudStorageService: CloudStorageService,
  ) {}

  async findAll(query: any = {}) {
    const { category, brand, minPrice, maxPrice, search, ...rest } = query;
    
    const queryBuilder = this.productsRepository.createQueryBuilder('product');

    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    if (minPrice) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }
    return product;
  }

  async create(createProductDto: CreateProductDto, files: Express.Multer.File[]) {
    const imageUrls = await Promise.all(
      files.map(file => this.cloudStorageService.uploadFile(file))
    );

    const product = this.productsRepository.create({
      ...createProductDto,
      images: imageUrls,
    });

    return this.productsRepository.save(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto, files?: Express.Multer.File[]) {
    const product = await this.findOne(id);

    if (files?.length) {
      const newImageUrls = await Promise.all(
        files.map(file => this.cloudStorageService.uploadFile(file))
      );
      product.images = [...product.images, ...newImageUrls];
    }

    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async updateStock(id: string, quantity: number) {
    const product = await this.findOne(id);
    product.stock += quantity;
    return this.productsRepository.save(product);
  }
} 