'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import ProductCard from './ProductCard'

interface RecommendationSliderProps {
  type: 'similar' | 'personal' | 'trending'
  sourceId?: string
  title: string
}

export default function RecommendationSlider({
  type,
  sourceId,
  title
}: RecommendationSliderProps) {
  const { data: session } = useSession()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const id = type === 'personal' 
          ? session?.user?.id 
          : sourceId

        if (!id && type !== 'trending') return

        const response = await fetch(
          `/api/recommendations?type=${type}&id=${id}`
        )
        
        if (!response.ok) throw new Error('Fehler beim Laden')
        
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [type, sourceId, session])

  if (loading) {
    return <div>Lädt...</div>
  }

  if (!products.length) {
    return null
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={4}
        navigation
        pagination={{ clickable: true }}
        className="recommendation-slider"
      >
        {products.map((product: any) => (
          <SwiperSlide key={product.id}>
            <ProductCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
} 