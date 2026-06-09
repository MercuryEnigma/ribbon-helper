import { Link } from 'react-router-dom'
import type { Guide } from './guideTypes'

const battleFacilityRibbons: Guide = {
  id: 'battle-facility-ribbons',
  title: 'Battle Facility Ribbons',
  description: (
    <>
      <p>Battle-facility Ribbons are awarded only to the Pokémon registered for the qualifying battle or set. I recommend building the streak with a stronger team where the format permits, then add the Ribbon Master for the last set or Facility Tycoon. Use the <Link to="/battle-facilities">Battle Facilities page</Link> to plan teams and calculate matchups.</p>
      <p className="guide-warning"><strong>Level warning:</strong> Obtain the Winning Ribbon before the Pokémon exceeds level 50. Pokémon at level 51 or higher cannot enter the Generation III Level 50 Battle Tower challenge and cannot lower their level later.</p>
    </>
  ),
  ribbonGuideEntries: [
    {
      ribbonId: 'winning-ribbon',
      content: (
        <>
          <p>Win a seven-battle set after a streak of at least 50 wins (eg. battles 50-56) in the Level 50 Battle Tower in Ruby, Sapphire, or Emerald. The Pokémon must not exceed level 50.</p>
        </>
      ),
    },
    {
      ribbonId: 'victory-ribbon',
      content: (
        <>
          <p>Win a seven-battle set after a streak of at least 50 wins (eg. battles 50-56) in the Level 100 mode in Ruby or Sapphire, or Open Level mode in Emerald.</p>
        </>
      ),
    },
    {
      ribbonId: 'ability-ribbon',
      content: (
        <>
          <p>Defeat Palmer on battle 21 of a Single Battle streak at the Battle Tower in Diamond, Pearl, Platinum, HeartGold, or SoulSilver.</p>
        </>
      ),
    },
    {
      ribbonId: 'great-ability-ribbon',
      content: (
        <>
          <p>Continue the same Single Battle streak and defeat Palmer again on battle 49. This Ribbon is awarded specifically for that battle.</p>
        </>
      ),
    },
    {
      ribbonId: 'double-ability-ribbon',
      content: (
        <>
          <p>Reach 50 consecutive wins in Double Battles at the Generation IV Battle Tower. Win battle 50 with the Pokémon on the registered team.</p>
        </>
      ),
    },
    {
      ribbonId: 'multi-ability-ribbon',
      content: (
        <>
          <p>Reach 50 consecutive wins in Multi Battles with an NPC partner at the Generation IV Battle Tower. Mira is generally the most reliable partner when she offers strong legendary Pokémon.</p>
        </>
      ),
    },
    {
      ribbonId: 'pair-ability-ribbon',
      content: (
        <>
          <p>Reach 50 consecutive wins in Link Multi Battles with another player at the Generation IV Battle Tower.</p>
        </>
      ),
    },
    {
      ribbonId: 'world-ability-ribbon',
      content: (
        <>
          <p>Rank up to Rank 5 or higher in the Generation IV Wi-Fi Battle Room. If you reach Rank 10, you must drop down then rank up again.</p>
          <p><strong>This Ribbon is no longer officially obtainable.</strong> Nintendo Wi-Fi Connection closed on May 20, 2014; accessing the challenge now requires an unofficial replacement service.</p>
        </>
      ),
    },
    {
      ribbonId: 'skillful-battler-ribbon',
      content: (
        <>
          <p>Defeat a Battle Chatelaine on battle 20 of any regular Battle Maison format in X, Y, Omega Ruby, or Alpha Sapphire.</p>
        </>
      ),
    },
    {
      ribbonId: 'expert-battler-ribbon',
      content: (
        <>
          <p>Defeat a Battle Chatelaine on battle 50 of any Super Battle format at the Battle Maison.</p>
        </>
      ),
    },
    {
      ribbonId: 'battle-royal-master-ribbon',
      content: (
        <>
          <p>Win a Master Rank Battle Royal at the Battle Royal Dome in Sun, Moon, Ultra Sun, or Ultra Moon. After unlocking every rank, you only need to win the Master Rank once to receive the ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'battle-tree-great-ribbon',
      content: (
        <>
          <p>Defeat the Battle Legend on battle 20 of a normal Battle Tree challenge. Red appears in Singles, Blue in Doubles, and both appear in Multi Battles.</p>
        </>
      ),
    },
    {
      ribbonId: 'battle-tree-master-ribbon',
      content: (
        <>
          <p>Defeat the Battle Legend on battle 50 of a Super Battle Tree challenge. Red appears in Singles, Blue in Doubles, and both appear in Multi Battles.</p>
        </>
      ),
    },
    {
      ribbonId: 'tower-master-ribbon',
      content: (
        <>
          <p>In Sword and Shield, defeat Leon at MAX Rank in the Battle Tower who appears after every 10 wins. In Brilliant Diamond and Shining Pearl, defeat Palmer at Rank 10 of Master Class Singles, or Palmer and Barry at Rank 10 of Master Class Doubles.</p>
        </>
      ),
    },
  ],
}

export default battleFacilityRibbons
