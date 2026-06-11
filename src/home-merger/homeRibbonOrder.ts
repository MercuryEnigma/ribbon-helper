import type {
  RibbonCellMatch,
  RibbonMatchCandidate,
} from './ribbonMatcher';

// Pokémon HOME displays these normally obtainable ribbons and marks in this
// fixed order, compacting missing entries without leaving gaps.
export const HOME_OBTAINABLE_ORDER = [
  'kalos-champion-ribbon',
  'champion-ribbon',
  'sinnoh-champion-ribbon',
  'best-friends-ribbon',
  'training-ribbon',
  'skillful-battler-ribbon',
  'expert-battler-ribbon',
  'effort-ribbon',
  'alert-ribbon',
  'shock-ribbon',
  'downcast-ribbon',
  'careless-ribbon',
  'relax-ribbon',
  'snooze-ribbon',
  'smile-ribbon',
  'gorgeous-ribbon',
  'royal-ribbon',
  'gorgeous-royal-ribbon',
  'artist-ribbon',
  'footprint-ribbon',
  'legend-ribbon',
  'national-ribbon',
  'earth-ribbon',
  'contest-memory-ribbon-gold',
  'battle-memory-ribbon-gold',
  'hoenn-champion-ribbon',
  'contest-star-ribbon',
  'coolness-master-ribbon',
  'beauty-master-ribbon',
  'cuteness-master-ribbon',
  'cleverness-master-ribbon',
  'toughness-master-ribbon',
  'alola-champion-ribbon',
  'battle-royal-master-ribbon',
  'battle-tree-great-ribbon',
  'battle-tree-master-ribbon',
  'galar-champion-ribbon',
  'tower-master-ribbon',
  'master-rank-ribbon',
  'hisui-ribbon',
  'twinkling-star-ribbon',
  'paldea-champion-ribbon',
  'itemfinder-mark',
  'partner-mark',
  'gourmand-mark',
] as const;

const HOME_ORDER_INDEX = new Map<string, number>(
  HOME_OBTAINABLE_ORDER.map((ribbonId, index) => [ribbonId, index]),
);
HOME_ORDER_INDEX.set(
  'contest-memory-ribbon',
  HOME_ORDER_INDEX.get('contest-memory-ribbon-gold')!,
);
HOME_ORDER_INDEX.set(
  'battle-memory-ribbon',
  HOME_ORDER_INDEX.get('battle-memory-ribbon-gold')!,
);
const EXTRA_MATCH_PENALTY = 0.06;

interface SequenceState {
  cost: number;
  candidates: RibbonMatchCandidate[];
}

function candidatesFor(match: RibbonCellMatch): RibbonMatchCandidate[] {
  const unique = new Map<string, RibbonMatchCandidate>();
  for (const candidate of [match.best, ...match.alternatives]) {
    const existing = unique.get(candidate.ribbonId);
    if (!existing || candidate.score < existing.score) {
      unique.set(candidate.ribbonId, candidate);
    }
  }
  return [...unique.values()];
}

export function resolveHomeRibbonOrder(
  matches: RibbonCellMatch[],
): RibbonCellMatch[] {
  let states = new Map<number, SequenceState>([
    [-1, { cost: 0, candidates: [] }],
  ]);

  for (const match of matches) {
    const nextStates = new Map<number, SequenceState>();

    for (const [lastOrder, state] of states) {
      for (const candidate of candidatesFor(match)) {
        const order = HOME_ORDER_INDEX.get(candidate.ribbonId);
        if (order !== undefined && order <= lastOrder) continue;

        const nextOrder = order ?? lastOrder;
        const nextCost = (
          state.cost
          + candidate.score
          + (order === undefined ? EXTRA_MATCH_PENALTY : 0)
        );
        const current = nextStates.get(nextOrder);

        if (!current || nextCost < current.cost) {
          nextStates.set(nextOrder, {
            cost: nextCost,
            candidates: [...state.candidates, candidate],
          });
        }
      }
    }

    if (nextStates.size === 0) {
      return matches.map(match => ({ ...match, accepted: true }));
    }
    states = nextStates;
  }

  const resolved = [...states.values()].sort((a, b) => a.cost - b.cost)[0];
  return matches.map((match, index) => {
    const best = resolved.candidates[index];
    const alternatives = candidatesFor(match).filter(
      candidate => candidate.ribbonId !== best.ribbonId,
    );
    const second = alternatives[0];

    return {
      ...match,
      best,
      alternatives,
      confidence: Math.max(0, Math.min(1, 1 - best.score)),
      margin: second ? second.score - best.score : match.margin,
      accepted: true,
    };
  });
}
