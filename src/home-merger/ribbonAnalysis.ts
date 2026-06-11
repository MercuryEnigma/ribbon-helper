import ribbonsData from '../data/ribbons.json';
import type {
  RibbonGameGroup,
  RibbonsMap,
} from '../switch-compatibility/ribbonUtils';

type MergeType = 'battle' | 'contest';

interface RibbonMetadata {
  merge?: MergeType;
}

export type MemorySatisfaction =
  | 'exact'
  | 'gold-upgrade'
  | 'standard-below-gold';

export interface EligibleRibbon {
  ribbonId: string;
  gameGroups: RibbonGameGroup[];
}

export interface OwnedRibbon extends EligibleRibbon {
  detectedRibbonId: string;
  satisfaction: MemorySatisfaction;
}

export interface RibbonCollectionAnalysis {
  owned: OwnedRibbon[];
  stillObtainable: EligibleRibbon[];
  missed: EligibleRibbon[];
  extras: string[];
}

const HOME_GAME_GROUPS = new Set<RibbonGameGroup>([
  'SwSh',
  'BDSP',
  'PLA',
  'SV',
  'PLZA',
]);

const SPECIAL_EXTRA_RIBBONS = new Set([
  'jumbo-mark',
  'mini-mark',
]);

const MEMORY_FAMILIES = {
  battle: {
    standard: 'battle-memory-ribbon',
    gold: 'battle-memory-ribbon-gold',
  },
  contest: {
    standard: 'contest-memory-ribbon',
    gold: 'contest-memory-ribbon-gold',
  },
} as const;

const RIBBON_ORDER = new Map(
  Object.keys(ribbonsData).map((ribbonId, index) => [ribbonId, index]),
);

function ribbonOrder(ribbonId: string): number {
  return RIBBON_ORDER.get(ribbonId) ?? Number.MAX_SAFE_INTEGER;
}

function memoryFamily(ribbonId: string): keyof typeof MEMORY_FAMILIES | null {
  for (const [family, ribbons] of Object.entries(MEMORY_FAMILIES)) {
    if (ribbonId === ribbons.standard || ribbonId === ribbons.gold) {
      return family as keyof typeof MEMORY_FAMILIES;
    }
  }
  return null;
}

function isGoldMemoryRibbon(ribbonId: string): boolean {
  return Object.values(MEMORY_FAMILIES).some(ribbons => ribbons.gold === ribbonId);
}

export function normalizeEligibleRibbons(eligible: RibbonsMap): EligibleRibbon[] {
  const groupsByRibbon = new Map<string, Set<RibbonGameGroup>>();
  const metadata = ribbonsData as Record<string, RibbonMetadata>;

  for (const [group, ribbons] of Object.entries(eligible) as [
    RibbonGameGroup,
    NonNullable<RibbonsMap[RibbonGameGroup]>,
  ][]) {
    for (const ribbonId of ribbons['available-ribbons']) {
      if (metadata[ribbonId]?.merge || SPECIAL_EXTRA_RIBBONS.has(ribbonId)) {
        continue;
      }

      const groups = groupsByRibbon.get(ribbonId) ?? new Set<RibbonGameGroup>();
      groups.add(group);
      groupsByRibbon.set(ribbonId, groups);
    }
  }

  return [...groupsByRibbon.entries()]
    .map(([ribbonId, gameGroups]) => ({
      ribbonId,
      gameGroups: [...gameGroups],
    }))
    .sort((a, b) => ribbonOrder(a.ribbonId) - ribbonOrder(b.ribbonId));
}

export function classifyRibbonCollection(
  eligible: RibbonsMap,
  detectedRibbonIds: Iterable<string>,
): RibbonCollectionAnalysis {
  const expected = normalizeEligibleRibbons(eligible);
  const expectedById = new Map(expected.map(ribbon => [ribbon.ribbonId, ribbon]));
  const expectedMemoryByFamily = new Map<
    keyof typeof MEMORY_FAMILIES,
    EligibleRibbon
  >();

  for (const ribbon of expected) {
    const family = memoryFamily(ribbon.ribbonId);
    if (family) expectedMemoryByFamily.set(family, ribbon);
  }

  const detected = [...new Set(detectedRibbonIds)];
  const satisfiedExpected = new Set<string>();
  const owned: OwnedRibbon[] = [];
  const extras: string[] = [];

  for (const detectedRibbonId of detected) {
    if (SPECIAL_EXTRA_RIBBONS.has(detectedRibbonId)) {
      extras.push(detectedRibbonId);
      continue;
    }

    const exact = expectedById.get(detectedRibbonId);
    if (exact) {
      satisfiedExpected.add(exact.ribbonId);
      owned.push({
        ...exact,
        detectedRibbonId,
        satisfaction: 'exact',
      });
      continue;
    }

    const family = memoryFamily(detectedRibbonId);
    const expectedMemory = family ? expectedMemoryByFamily.get(family) : undefined;
    if (!family || !expectedMemory) {
      extras.push(detectedRibbonId);
      continue;
    }

    if (
      isGoldMemoryRibbon(detectedRibbonId)
      && !isGoldMemoryRibbon(expectedMemory.ribbonId)
    ) {
      satisfiedExpected.add(expectedMemory.ribbonId);
      owned.push({
        ...expectedMemory,
        detectedRibbonId,
        satisfaction: 'gold-upgrade',
      });
      continue;
    }

    owned.push({
      ...expectedMemory,
      detectedRibbonId,
      satisfaction: 'standard-below-gold',
    });
  }

  const stillObtainable: EligibleRibbon[] = [];
  const missed: EligibleRibbon[] = [];

  for (const ribbon of expected) {
    if (satisfiedExpected.has(ribbon.ribbonId)) continue;

    if (ribbon.gameGroups.some(group => HOME_GAME_GROUPS.has(group))) {
      stillObtainable.push(ribbon);
    } else {
      missed.push(ribbon);
    }
  }

  return {
    owned: owned.sort(
      (a, b) => ribbonOrder(a.detectedRibbonId) - ribbonOrder(b.detectedRibbonId),
    ),
    stillObtainable,
    missed,
    extras: extras.sort((a, b) => ribbonOrder(a) - ribbonOrder(b)),
  };
}
