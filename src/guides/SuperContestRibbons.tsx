import { Link } from 'react-router-dom'
import type { Guide, RibbonGuideEntry } from './guideTypes'

type ContestCategory = {
  name: string
  ribbonIds: [string, string, string, string]
}

const categories: ContestCategory[] = [
  {
    name: 'Cool',
    ribbonIds: ['cool-ribbon-sinnoh', 'cool-ribbon-great-sinnoh', 'cool-ribbon-ultra-sinnoh', 'cool-ribbon-master-sinnoh'],
  },
  {
    name: 'Beauty',
    ribbonIds: ['beauty-ribbon-sinnoh', 'beauty-ribbon-great-sinnoh', 'beauty-ribbon-ultra-sinnoh', 'beauty-ribbon-master-sinnoh'],
  },
  {
    name: 'Cute',
    ribbonIds: ['cute-ribbon-sinnoh', 'cute-ribbon-great-sinnoh', 'cute-ribbon-ultra-sinnoh', 'cute-ribbon-master-sinnoh'],
  },
  {
    name: 'Smart',
    ribbonIds: ['smart-ribbon-sinnoh', 'smart-ribbon-great-sinnoh', 'smart-ribbon-ultra-sinnoh', 'smart-ribbon-master-sinnoh'],
  },
  {
    name: 'Tough',
    ribbonIds: ['tough-ribbon-sinnoh', 'tough-ribbon-great-sinnoh', 'tough-ribbon-ultra-sinnoh', 'tough-ribbon-master-sinnoh'],
  },
]

const ranks = [
  { name: 'Normal', previous: null },
  { name: 'Great', previous: 'Normal' },
  { name: 'Ultra', previous: 'Great' },
  { name: 'Master', previous: 'Ultra' },
] as const

function createCategoryEntries(category: ContestCategory): RibbonGuideEntry[] {
  return category.ribbonIds.map((ribbonId, index) => {
    const rank = ranks[index]
    const requirement = rank.previous ? ` The same Pokémon must first win ${rank.previous} Rank in this category.` : ''

    return {
      ribbonId,
      content: (
        <>
          <p>Win the {rank.name} Rank {category.name} Super Contest.{requirement}</p>
        </>
      ),
    }
  })
}

const superContestRibbons: Guide = {
  id: 'super-contest-ribbons',
  title: '(DS) Super Contest Ribbons',
  description: (
    <>
      <p>Win Normal, Great, Ultra, and Master Rank in each category in Diamond, Pearl, or Platinum (20 contests in total).</p>
      <ul>
        <li>All ranks and categories are held in Hearthome City's Contest Hall.</li>
        <li>These ribbons are different from the Contest Ribbons in Ruby, Sapphire, and Emerald.</li>
      </ul>
      <p>I recommend planning which Poffins to feed ahead of time because sheen limits how many a Pokémon can eat.</p>
      <ul>
        <li>The <Link to="/berry-blending/dppt">DPPt Poffin Baking guide</Link> can help plan efficient Poffins.</li>
        <li>The <Link to="/contest-moves/dppt">DPPt Contest Moves guide</Link> can help build a moveset for the Acting competition.</li>
        <li>The <Link to="/visual-decoration/dppt-accessories">DPPt Accessories guide</Link> can help with the theme portion of the Visual competition.</li>
      </ul>
    </>
  ),
  ribbonGuideEntries: categories.flatMap(createCategoryEntries),
}

export default superContestRibbons
