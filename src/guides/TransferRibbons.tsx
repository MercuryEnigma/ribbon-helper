import type { Guide } from './guideTypes'

const transferRibbons: Guide = {
  id: 'transfer-ribbons',
  title: 'Transfer Ribbons',
  description: 'Poké Transporter permanently consolidates old Generation III and IV Contest and Tower Ribbons when moving a Pokémon from Generation V into Pokémon Bank. Finish every old Ribbon you care about before transporting; the original individual Ribbons cannot be restored afterward.',
  ribbonGuideEntries: [
    {
      ribbonId: 'contest-memory-ribbon',
      content: (
        <>
          <p>Awarded when a Pokémon with at least one, but not all, old Contest Ribbon is transferred from Generation V to Pokémon Bank. The source Ribbons are replaced by this memory Ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'contest-memory-ribbon-gold',
      content: (
        <>
          <p>Awarded as the gold version when the Pokémon has all 40 old Contest Ribbons: all 20 Hoenn Contest Ribbons from RSE and all 20 Sinnoh Super Contest Ribbons from DPPt.</p>
          <ul>
            <li>Pokémon originating in Generation IV cannot obtain all 40 source Ribbons.</li>
            <li>Sun, Moon, Ultra Sun, and Ultra Moon have a visual bug that prevents the gold version from displaying correctly.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'battle-memory-ribbon',
      content: (
        <>
          <p>Awarded when a Pokémon with at least one, but not all, old Tower Ribbon is transferred from Generation V to Pokémon Bank. The source Ribbons are replaced by this memory Ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'battle-memory-ribbon-gold',
      content: (
        <>
          <p>The original gold requirement is all eight old Tower Ribbons: Winning, Victory, Ability, Great Ability, Double Ability, Multi Ability, Pair Ability, and World Ability.</p>
          <p>As of Scarlet and Violet, a Battle Memory Ribbon representing seven of the eight also displays as gold because the World Ability Ribbon is no longer officially obtainable. Earlier games may display that same Ribbon differently.</p>
          <ul>
            <li>Pokémon originating in Generation IV cannot obtain all eight source Ribbons.</li>
            <li>Sun, Moon, Ultra Sun, and Ultra Moon have a visual bug that prevents the gold version from displaying correctly.</li>
          </ul>
        </>
      ),
    },
  ],
}

export default transferRibbons
