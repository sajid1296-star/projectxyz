import { NextResponse } from 'next/server';
import { DeviceType, DeviceCondition } from '@prisma/client';

// Basis-Preistabelle (könnte auch aus der Datenbank kommen)
const baseValues: Record<DeviceType, number> = {
  smartphone: 300,
  tablet: 200,
  laptop: 500,
  smartwatch: 150,
  other: 100,
};

// Zustandsfaktoren
const conditionFactors: Record<DeviceCondition, number> = {
  new: 1.0,
  likeNew: 0.9,
  good: 0.7,
  fair: 0.5,
  poor: 0.3,
};

// Markenfaktoren (vereinfacht)
const brandFactors: Record<string, number> = {
  'apple': 1.2,
  'samsung': 1.1,
  'google': 1.0,
  'sony': 0.9,
  'default': 0.8,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceType, brand, condition, storage } = body;

    // Basispreis ermitteln
    let estimatedPrice = baseValues[deviceType as DeviceType] || baseValues.other;

    // Markenfaktor anwenden
    const brandLower = brand.toLowerCase();
    const brandFactor = brandFactors[brandLower] || brandFactors.default;
    estimatedPrice *= brandFactor;

    // Zustandsfaktor anwenden
    estimatedPrice *= conditionFactors[condition as DeviceCondition];

    // Speichergröße berücksichtigen (optional)
    if (storage) {
      const storageGB = parseInt(storage);
      if (!isNaN(storageGB)) {
        if (storageGB >= 512) estimatedPrice *= 1.3;
        else if (storageGB >= 256) estimatedPrice *= 1.2;
        else if (storageGB >= 128) estimatedPrice *= 1.1;
      }
    }

    // Preis runden
    estimatedPrice = Math.round(estimatedPrice * 100) / 100;

    return NextResponse.json({ estimatedPrice });
  } catch (error) {
    console.error('Price Estimation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 