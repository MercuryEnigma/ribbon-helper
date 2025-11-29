/**
 * Helper functions for getting berry and poffin image URLs
 */

// Mapping of poffin names to their Bulbapedia direct image URLs
const POFFIN_IMAGE_MAP: Record<string, string> = {
  'spicy-dry': 'https://archives.bulbagarden.net/media/upload/4/4d/Spicy-Dry_Poffin.png',
  'spicy-sweet': 'https://archives.bulbagarden.net/media/upload/9/91/Spicy-Sweet_Poffin.png',
  'spicy-bitter': 'https://archives.bulbagarden.net/media/upload/e/ee/Spicy-Bitter_Poffin.png',
  'spicy-sour': 'https://archives.bulbagarden.net/media/upload/1/1d/Spicy-Sour_Poffin.png',
  'dry-sweet': 'https://archives.bulbagarden.net/media/upload/a/ad/Dry-Sweet_Poffin.png',
  'dry-bitter': 'https://archives.bulbagarden.net/media/upload/5/51/Dry-Bitter_Poffin.png',
  'dry-sour': 'https://archives.bulbagarden.net/media/upload/9/94/Dry-Sour_Poffin.png',
  'sweet-bitter': 'https://archives.bulbagarden.net/media/upload/5/56/Sweet-Bitter_Poffin.png',
  'sweet-sour': 'https://archives.bulbagarden.net/media/upload/3/3c/Sweet-Sour_Poffin.png',
  'bitter-sour': 'https://archives.bulbagarden.net/media/upload/b/bb/Bitter-Sour_Poffin.png',
  'mild': 'https://archives.bulbagarden.net/media/upload/f/f9/Mild_Poffin.png'
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

  // Get berry name in lowercase for pokesprite URL
  const berryName = firstBerry.toLowerCase();

  // Pokesprite URL format: https://raw.githubusercontent.com/msikma/pokesprite/master/icons/berry/{name}.png
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/icons/berry/${berryName}.png`;
}
