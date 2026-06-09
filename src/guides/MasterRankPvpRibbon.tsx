import type { Guide } from './guideTypes'

const masterRankPvpRibbon: Guide = {
  id: 'master-rank-pvp',
  title: 'Master Rank PvP Ribbon',
  description: 'Available through Ranked Battles in Sword and Shield or Scarlet and Violet. The Pokémon must be on a non-rental team that wins after the player has reached Master Ball tier.',
  ribbonGuideEntries: [
    {
      ribbonId: 'master-rank-ribbon',
      content: (
        <>
          <p>Reach Master Ball tier in either Singles or Doubles, then win a Ranked Battle with the Pokémon on the selected team. Every Pokémon on that team receives the Ribbon, including those not selected at Team Preview.</p>
          <ul>
            <li>I recommend using a rental team to climb to Master Ball tier, then switching to a personal team containing the Ribbon Master for the qualifying win.</li>
            <li>I recommend checking the current regulation before choosing a game because species eligibility changes between formats.</li>
            <li>The r/ribbonmasters Discord community hosts weekend "Fight Nights" for Sword / Shield and Scarlet / Violet.</li>
          </ul>
        </>
      ),
    },
  ],
}

export default masterRankPvpRibbon
