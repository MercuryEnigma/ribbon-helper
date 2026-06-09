import { Link } from 'react-router-dom'
import type { Guide, RibbonGuideEntry } from './guideTypes'

type ContestCategory = {
  name: string
  ribbonIds: [string, string, string, string]
}

const categories: ContestCategory[] = [
  {
    name: 'Cool',
    ribbonIds: ['cool-ribbon-hoenn', 'cool-ribbon-super-hoenn', 'cool-ribbon-hyper-hoenn', 'cool-ribbon-master-hoenn'],
  },
  {
    name: 'Beauty',
    ribbonIds: ['beauty-ribbon-hoenn', 'beauty-ribbon-super-hoenn', 'beauty-ribbon-hyper-hoenn', 'beauty-ribbon-master-hoenn'],
  },
  {
    name: 'Cute',
    ribbonIds: ['cute-ribbon-hoenn', 'cute-ribbon-super-hoenn', 'cute-ribbon-hyper-hoenn', 'cute-ribbon-master-hoenn'],
  },
  {
    name: 'Smart',
    ribbonIds: ['smart-ribbon-hoenn', 'smart-ribbon-super-hoenn', 'smart-ribbon-hyper-hoenn', 'smart-ribbon-master-hoenn'],
  },
  {
    name: 'Tough',
    ribbonIds: ['tough-ribbon-hoenn', 'tough-ribbon-super-hoenn', 'tough-ribbon-hyper-hoenn', 'tough-ribbon-master-hoenn'],
  },
]

const ranks = [
  { name: 'Normal', previous: null },
  { name: 'Super', previous: 'Normal' },
  { name: 'Hyper', previous: 'Super' },
  { name: 'Master', previous: 'Hyper' },
] as const

function createCategoryEntries(category: ContestCategory): RibbonGuideEntry[] {
  return category.ribbonIds.map((ribbonId, index) => {
    const rank = ranks[index]
    const requirement = rank.previous ? ` The same Pokémon must first win ${rank.previous} Rank in this category.` : ''

    return {
      ribbonId,
      content: (
        <>
          <p>Win the {rank.name} Rank {category.name} Contest.{requirement}</p>
        </>
      ),
    }
  })
}

const contestRibbons: Guide = {
  id: 'contest-ribbons',
  title: '(GBA) Contest Ribbons',
  description: (
    <>
      <p>Win Normal, Super, Hyper, and Master Rank in each category in Ruby, Sapphire, or Emerald (20 contests in total).</p>
      <ul>
        <li>Ruby and Sapphire use Verdanturf, Fallarbor, Slateport, and Lilycove for each rank.</li>
        <li>Emerald holds all ranks in Lilycove.</li>
      </ul>
      <p>I recommend planning which Pokéblocks to feed ahead of time because sheen limits how many a Pokémon can eat. I also recommend obtaining the "pinch" berries in the GameCube titles.</p>
      <ul>
        <li>The <Link to="/berry-blending/rse">RSE Berry Blending guide</Link> can help plan efficient Pokéblocks.</li>
        <li>The <Link to="/contest-moves/rse">RSE Contest Moves guide</Link> can help build an appeal moveset.</li>
      </ul>
    </>
  ),
  ribbonGuideEntries: [
    {
      ribbonId: 'artist-ribbon',
      content: (
        <>
          <p>First speak to the curator on the second floor of the Lilycove Museum. Then win a Master Rank Contest in Ruby, Sapphire, or Emerald with at least 40 appeal hearts (800 total points) and agree to have the Pokémon's portrait displayed when offered.</p>
          <ul>
            <li>A strong condition score and a matching colored scarf make the 800-point requirement easier.</li>
            <li>This Ribbon cannot be earned in Omega Ruby or Alpha Sapphire.</li>
          </ul>
        </>
      ),
    },
    ...categories.flatMap(createCategoryEntries),
  ],
}

export default contestRibbons
