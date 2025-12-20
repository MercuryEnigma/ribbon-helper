import stickers from '../data/stickers_bdsp.json';

export type StickerAcquisition =
  | 'amity-square'
  | 'canalave-city'
  | 'champion-final'
  | 'contest-reward'
  | 'flower-shop'
  | 'gym-initial'
  | 'gym-rematch'
  | 'jubilife-tv'
  | 'massage-girl'
  | 'route-206'
  | 'route-209'
  | 'route-213'
  | 'snowpoint-city'
  | 'starter-locale'
  | 'style-shop'
  | 'sunyshore-market'
  | 'contest-showmaster'
  | 'super-contest-hall';

export type ContestType = 'cool' | 'beautiful' | 'cute' | 'clever' | 'tough' | 'sheen';

type PageLabel = `${string}`;

type StickerRecord = {
  name: string;
  page: string;
  acquisition: Record<StickerAcquisition, string>;
} & Record<ContestType, number>;

export type StickerInfo = {
  name: string;
  acquisition: Record<StickerAcquisition, string>;
};

type PageGroup = Record<string, StickerInfo>;
export type StickerResult = Record<number, Record<PageLabel, PageGroup>>;

/**
 * Returns stickers obtainable through the eligible acquisition methods,
 * grouped by the contest score for the given contest type, then by page label.
 */
export function getStickers(contestType: ContestType, eligibleAcquisitions: Set<StickerAcquisition>): StickerResult {
  const result: StickerResult = {};

  Object.entries(stickers as Record<string, StickerRecord>).forEach(([id, data]) => {
    const acquisitionMethods = Object.keys(data.acquisition) as StickerAcquisition[];
    const hasEligible = acquisitionMethods.some((a) => eligibleAcquisitions.has(a));
    if (!hasEligible) return;

    const score = data[contestType] ?? 0;
    const pageLabel = `${data.page}` as PageLabel;

    if (!result[score]) {
      result[score] = {} as Record<PageLabel, PageGroup>;
    }
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
