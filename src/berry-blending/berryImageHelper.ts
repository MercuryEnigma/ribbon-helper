/**
 * Helper functions for getting berry and poffin image URLs
 */

const BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';

// Local poffin image assets (downloaded into public/images/poffins)
const poffinAsset = (slug: string) => `${BASE_URL}images/poffins/${slug}.png`;
const berryAsset = (slug: string) => `${BASE_URL}images/berries/${slug}.png`;

const slugify = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const POFFIN_IMAGE_MAP: Record<string, string> = {
  'spicy-dry': poffinAsset('spicy-dry'),
  'spicy-sweet': poffinAsset('spicy-sweet'),
  'spicy-bitter': poffinAsset('spicy-bitter'),
  'spicy-sour': poffinAsset('spicy-sour'),
  'dry-sweet': poffinAsset('dry-sweet'),
  'dry-bitter': poffinAsset('dry-bitter'),
  'dry-sour': poffinAsset('dry-sour'),
  'sweet-bitter': poffinAsset('sweet-bitter'),
  'sweet-sour': poffinAsset('sweet-sour'),
  'bitter-sour': poffinAsset('bitter-sour'),
  'mild': poffinAsset('mild')
};

/**
 * Gets the image URL for a berry or poffin
 * @param berryOrPoffinName - The name of the berry/poffin from the berries field
 * @returns The URL to the image, or null if no image is available
 */
export function getBerryImageUrl(berryOrPoffinName: string): string | null {
  const name = berryOrPoffinName.trim().toLowerCase();

  // Handle Mild poffin gift
  if (name.includes('mild')) {
    return POFFIN_IMAGE_MAP['mild'];
  }

  // Handle special poffins from Veilstone Dept. Store (Platinum)
  // Format: "Spicy-Dry", "Dry-Sweet", etc. (hyphenated flavor combinations)
  const poffinNameMatch = berryOrPoffinName.match(/^(Spicy|Dry|Sweet|Bitter|Sour)-(Spicy|Dry|Sweet|Bitter|Sour)/i);
  if (poffinNameMatch) {
    const key = poffinNameMatch[0].toLowerCase();
    const imageUrl = POFFIN_IMAGE_MAP[key];
    if (imageUrl) {
      return imageUrl;
    }
  }

  // Extract the first berry name from comma-separated list
  const firstBerry = berryOrPoffinName.split(',')[0].trim();

  // Skip if it's a description (contains parentheses or special text)
  if (firstBerry.includes('(') || firstBerry.includes('Gift') || firstBerry.includes('buy from')) {
    return null;
  }

  const berrySlug = slugify(firstBerry);
  if (!berrySlug) return null;

  return berryAsset(berrySlug);
}
