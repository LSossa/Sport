export interface FoodProduct {
  name: string;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  servingGrams: number;
}

function parseServingGrams(serving: string | undefined): number {
  if (!serving) return 100;
  const match = serving.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  return match ? parseFloat(match[1].replace(',', '.')) : 100;
}

export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_size`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const { product } = json;
  const n = product.nutriments ?? {};

  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);

  return {
    name: product.product_name ?? '',
    per100g: {
      calories:  Math.round(kcal),
      protein_g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
      carbs_g:   Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fat_g:     Math.round((n['fat_100g'] ?? 0) * 10) / 10,
    },
    servingGrams: parseServingGrams(product.serving_size),
  };
}
