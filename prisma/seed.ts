import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Admin-Benutzer erstellen
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      },
    });

    // Kategorien erstellen
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { name: 'Laptops' },
        update: {},
        create: { name: 'Laptops' },
      }),
      prisma.category.upsert({
        where: { name: 'Smartphones' },
        update: {},
        create: { name: 'Smartphones' },
      }),
      prisma.category.upsert({
        where: { name: 'Tablets' },
        update: {},
        create: { name: 'Tablets' },
      }),
    ]);

    // Marken erstellen
    const brands = await Promise.all([
      prisma.brand.upsert({
        where: { name: 'Apple' },
        update: {},
        create: { name: 'Apple' },
      }),
      prisma.brand.upsert({
        where: { name: 'Samsung' },
        update: {},
        create: { name: 'Samsung' },
      }),
      prisma.brand.upsert({
        where: { name: 'Dell' },
        update: {},
        create: { name: 'Dell' },
      }),
    ]);

    // Beispielprodukte erstellen
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: 'MacBook Pro 14"',
          description: 'Apple M2 Pro Chip, 16GB RAM, 512GB SSD',
          price: 1999.99,
          stock: 10,
          specifications: {
            processor: 'Apple M2 Pro',
            ram: '16GB',
            storage: '512GB SSD',
            display: '14-inch Liquid Retina XDR',
            os: 'macOS',
          },
          brand: { connect: { name: 'Apple' } },
          category: { connect: { name: 'Laptops' } },
          images: {
            create: [
              { url: 'https://example.com/images/macbook-pro-1.jpg' },
              { url: 'https://example.com/images/macbook-pro-2.jpg' },
            ],
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'Samsung Galaxy S23 Ultra',
          description: '256GB, Phantom Black',
          price: 1199.99,
          stock: 15,
          specifications: {
            processor: 'Snapdragon 8 Gen 2',
            ram: '12GB',
            storage: '256GB',
            display: '6.8" Dynamic AMOLED 2X',
            camera: '200MP + 12MP + 10MP + 10MP',
          },
          brand: { connect: { name: 'Samsung' } },
          category: { connect: { name: 'Smartphones' } },
          images: {
            create: [
              { url: 'https://example.com/images/s23-ultra-1.jpg' },
              { url: 'https://example.com/images/s23-ultra-2.jpg' },
            ],
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'Dell XPS 15',
          description: 'Intel i9, 32GB RAM, 1TB SSD, RTX 4070',
          price: 2499.99,
          stock: 5,
          specifications: {
            processor: 'Intel Core i9-13900H',
            ram: '32GB DDR5',
            storage: '1TB NVMe SSD',
            gpu: 'NVIDIA RTX 4070',
            display: '15.6" 4K OLED Touch',
          },
          brand: { connect: { name: 'Dell' } },
          category: { connect: { name: 'Laptops' } },
          images: {
            create: [
              { url: 'https://example.com/images/xps-15-1.jpg' },
              { url: 'https://example.com/images/xps-15-2.jpg' },
            ],
          },
        },
      }),
    ]);

    console.log('Seed-Daten erfolgreich erstellt');
  } catch (error) {
    console.error('Fehler beim Seeden der Datenbank:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 