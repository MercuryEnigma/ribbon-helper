import accessories from '../data/accessories_dppt.json';

export type Acquisition =
  | 'amity-square'
  | 'massage-girl'
  | 'flower-shop'
  | 'contest-reward'
  | 'starter-mask'
  | 'eterna-forest'
  | 'route-206'
  | 'pal-park'
  | 'unobtainable';

export type Theme =
  | 'bright'
  | 'colorful'
  | 'created'
  | 'festive'
  | 'flexible'
  | 'gaudy'
  | 'intangible'
  | 'natural'
  | 'relaxed'
  | 'shapely'
  | 'sharp'
  | 'solid';

type Score = 0 | 1 | 2;
type PageLabel = `page ${string}`;

type AccessoryAcquisition = Partial<Record<Acquisition, string>>;

type AccessoryRecord = {
  name: string;
  page: string;
  acquisition: AccessoryAcquisition;
} & Record<Theme, Score>;

type AccessoryInfo = {
  name: string;
  acquisition: AccessoryAcquisition;
};

type PageGroup = Record<string, AccessoryInfo>;
export type AccessoryResult = Record<Score, Record<PageLabel, PageGroup>>;

/**
 * Returns accessories that can be acquired via the provided methods,
 * grouped by the theme score (2, 1, 0) and then by their source page.
 */
export function getAccessories(theme: Theme, eligibleAcquisitions: Set<Acquisition>): AccessoryResult {
  const result: AccessoryResult = { 2: {}, 1: {}, 0: {} };

  Object.entries(accessories as Record<string, AccessoryRecord>).forEach(([id, data]) => {
    const acquisitionMethods = Object.keys(data.acquisition) as Acquisition[];
    const hasEligible = acquisitionMethods.some((a) => eligibleAcquisitions.has(a));
    if (!hasEligible) return;

    const score = (data[theme] ?? 0) as Score;
    const pageLabel = `page ${data.page}` as PageLabel;

    if (!result[score][pageLabel]) {
      result[score][pageLabel] = {};
    }

    result[score][pageLabel][id] = {
      name: data.name,
      acquisition: data.acquisition
    };
  });

  return result;
}
