import { Link } from 'react-router-dom'
import type { Guide, RibbonGuideEntry } from './guideTypes'

type MasterRankCategory = {
  orasName: string
  bdspName: string
  ribbonId: string
}

const categories: MasterRankCategory[] = [
  {
    orasName: 'Cool',
    bdspName: 'Coolness',
    ribbonId: 'coolness-master-ribbon',
  },
  {
    orasName: 'Beauty',
    bdspName: 'Beauty',
    ribbonId: 'beauty-master-ribbon',
  },
  {
    orasName: 'Cute',
    bdspName: 'Cuteness',
    ribbonId: 'cuteness-master-ribbon',
  },
  {
    orasName: 'Cleverness',
    bdspName: 'Cleverness',
    ribbonId: 'cleverness-master-ribbon',
  },
  {
    orasName: 'Tough',
    bdspName: 'Toughness',
    ribbonId: 'toughness-master-ribbon',
  },
]

function createCategoryEntry(category: MasterRankCategory): RibbonGuideEntry {
  return {
    ribbonId: category.ribbonId,
    content: (
      <>
        <p>
          Win a Master Rank {category.orasName} Contest Spectacular at any Hoenn Contest Hall in Omega Ruby or Alpha Sapphire, or a Master Rank {category.bdspName} Super Contest Show in Hearthome City in Brilliant Diamond or Shining Pearl.
        </p>
      </>
    ),
  }
}

const masterRankContestRibbons: Guide = {
  id: 'master-rank-contest-ribbons',
  title: 'Master Rank Contest Ribbons',
  description: (
    <>
      <p>Earn the Master Rank Ribbon for all five contest categories in Omega Ruby and Alpha Sapphire or Brilliant Diamond and Shining Pearl.</p>
      <ul>
        <li>ORAS holds every rank and category at the Contest Halls in Slateport City, Verdanturf Town, Fallarbor Town, and Lilycove City.</li>
        <li>BDSP holds every Super Contest Show in Hearthome City's Contest Hall.</li>
        <li>The same five category Ribbons are used in both games, so Ribbons earned in ORAS still count toward the Contest Star Ribbon after transfer to BDSP.</li>
      </ul>
      <p>I recommend using the guides for the game where you plan to earn each Ribbon:</p>
      <ul>
        <li>ORAS: <Link to="/berry-blending/oras">Pokéblock Blending</Link> and <Link to="/contest-moves/oras">Contest Moves</Link>.</li>
        <li>BDSP: <Link to="/berry-blending/bdsp">Poffin Baking</Link>, <Link to="/contest-moves/bdsp">Contest Moves</Link>, and <Link to="/visual-decoration/bdsp-ball-stickers">Ball Stickers</Link>.</li>
      </ul>
    </>
  ),
  ribbonGuideEntries: [
    ...categories.map(createCategoryEntry),
    {
      ribbonId: 'contest-star-ribbon',
      content: (
        <>
          <p>Automatically awarded after the same Pokémon earns all five category Master Rank Ribbons. The five Ribbons can come from ORAS, BDSP, or a combination of both.</p>
        </>
      ),
    },
    {
      ribbonId: 'twinkling-star-ribbon',
      content: (
        <>
          <p>In Brilliant Diamond or Shining Pearl, win the Master Rank Brilliant Contest or Shining Contest in Hearthome City. The same Pokémon must first obtain the Contest Star Ribbon.</p>
          <ul>
            <li>Visual score is determined by sheen. It is impossible to max out the visual score in Master Rank.</li>
            <li>I recommend obtaining multiple Champion Stickers from the final tier of Cynthia's rematch to make this contest substantially easier.</li>
          </ul>
        </>
      ),
    },
  ],
}

export default masterRankContestRibbons
