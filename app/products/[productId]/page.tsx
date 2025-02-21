'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useCart } from '@/hooks/useCart';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: Array<{ url: string }>;
  specifications: Record<string, any>;
  stock: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export default function ProductDetail({ params }: { params: { productId: string } }) {
  const { data: session } = useSession();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [params.productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.productId}`);
      if (!response.ok) throw new Error('Produkt nicht gefunden');
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      toast.error('Fehler beim Laden des Produkts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]?.url,
      quantity: 1
    });
    
    toast.success('Produkt wurde zum Warenkorb hinzugefügt');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Produkt nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Bildergalerie */}
        <div className="flex flex-col">
          <div className="relative h-96 w-full">
            <Image
              src={product.images[selectedImage]?.url || '/placeholder.png'}
              alt={product.name}
              fill
              className="object-cover rounded-lg"
            />
          </div>
          
          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-24 w-full rounded-lg overflow-hidden ${
                    selectedImage === index ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Produktinformationen */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {product.name}
          </h1>
          
          <div className="mt-3">
            <h2 className="sr-only">Produktinformationen</h2>
            <p className="text-3xl text-gray-900">{formatCurrency(product.price)}</p>
          </div>

          <div className="mt-6">
            <h3 className="sr-only">Beschreibung</h3>
            <div className="text-base text-gray-700 space-y-6">
              {product.description}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center">
              <div className={`rounded-full h-3 w-3 ${
                product.stock > 0 ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <p className="ml-2 text-sm text-gray-500">
                {product.stock > 0 
                  ? `${product.stock} auf Lager` 
                  : 'Nicht verfügbar'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              In den Warenkorb
            </button>
          </div>

          {/* Spezifikationen */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-medium text-gray-900">Spezifikationen</h2>
            <div className="mt-4 prose prose-sm text-gray-500">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 pb-4">
                    <dt className="font-medium text-gray-900">{key}</dt>
                    <dd className="mt-1 text-gray-500">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Bewertungen */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Kundenbewertungen</h2>
        
        <ReviewSummary
          averageRating={product.averageRating}
          totalReviews={product.totalReviews}
          ratingDistribution={product.ratingDistribution}
        />

        {session?.user && (
          <div className="mt-8">
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showReviewForm ? 'Bewertung ausblenden' : 'Produkt bewerten'}
            </button>

            {showReviewForm && (
              <div className="mt-4">
                <ReviewForm
                  productId={product.id}
                  onSuccess={() => {
                    setShowReviewForm(false);
                    setReviewRefreshTrigger(prev => prev + 1);
                    fetchProduct(); // Aktualisiere Produktbewertungen
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <ReviewList
            productId={product.id}
            refreshTrigger={reviewRefreshTrigger}
          />
        </div>
      </div>
    </div>
  );
} 