import additionalRibbons from './AdditionalRibbons'
import battleFacilityRibbons from './BattleFacilityRibbons'
import championRibbons from './ChampionRibbons'
import contestRibbons from './ContestRibbons'
import dailyRibbons from './DailyRibbons'
import earnableMarks from './EarnableMarks'
import footprintRibbon from './FootprintRibbon'
import masterRankContestRibbons from './MasterRankContestRibbons'
import masterRankPvpRibbon from './MasterRankPvpRibbon'
import purchaseRibbons from './PurchaseRibbons'
import superContestRibbons from './SuperContestRibbons'
import transferRibbons from './TransferRibbons'
import type { Guide } from './guideTypes'

export const GUIDES: Guide[] = [
  footprintRibbon,
  earnableMarks,
  championRibbons,
  contestRibbons,
  superContestRibbons,
  masterRankContestRibbons,
  battleFacilityRibbons,
  dailyRibbons,
  purchaseRibbons,
  masterRankPvpRibbon,
  additionalRibbons,
  transferRibbons,
]

export const DEFAULT_GUIDE_ID = GUIDES[0].id

export function getGuideById(guideId: string | undefined): Guide {
  return GUIDES.find(guide => guide.id === guideId) ?? GUIDES[0]
}
