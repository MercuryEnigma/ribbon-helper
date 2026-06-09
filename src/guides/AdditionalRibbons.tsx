import type { Guide } from './guideTypes'

const additionalRibbons: Guide = {
  id: 'additional-ribbons',
  title: 'Additional Ribbons',
  description: 'These are miscellaneous in-game Ribbons earned from EVs, affection or friendship, Super Training, Orre purification and Mt. Battle, Red, and the Hisui photo studio.',
  ribbonGuideEntries: [
    {
      ribbonId: 'effort-ribbon',
      content: (
        <>
          <p>Show a Pokémon with 510 total EVs to the appropriate NPC.</p>
          <ul>
            <li><strong>RSE/ORAS:</strong> Slateport Market.</li>
            <li><strong>DPPt/BDSP:</strong> Sunyshore Market.</li>
            <li><strong>HGSS:</strong> Blackthorn City, in the house east of the Pokémon Center.</li>
            <li><strong>XY:</strong> Laverre City Pokémon Fan Club.</li>
            <li><strong>SM/USUM:</strong> Battle Royal Dome on Royal Avenue.</li>
            <li><strong>SwSh:</strong> first house east of the Hammerlocke Stadium entrance.</li>
            <li><strong>SV:</strong> woman with a Luxio in southern Levincia.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'best-friends-ribbon',
      content: (
        <>
          <p>In the 3DS games, max the Pokémon's Affection. In the Switch games, max its Friendship. Then show it to the Ribbon NPC.</p>
          <ul>
            <li><strong>XY:</strong> Bonnie in Prism Tower, the Lumiose City Gym.</li>
            <li><strong>ORAS:</strong> the woman on the right in Apartment 2 in Mauville Hills.</li>
            <li><strong>SM/USUM:</strong> Malie City Community Center.</li>
            <li><strong>SwSh:</strong> first house east of the Hammerlocke Stadium entrance.</li>
            <li><strong>BDSP:</strong> back-left corner of the Hearthome City Pokémon Fan Club.</li>
            <li><strong>SV:</strong> NPC with a Marill near the fountain in Cascarrafa.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'training-ribbon',
      content: (
        <>
          <p>In X, Y, Omega Ruby, or Alpha Sapphire, beat the target times for all 18 regular Super Training regimens and all 12 Secret Super Training regimens with the Pokémon, then show it to the NPC.</p>
          <ul>
            <li><strong>XY:</strong> woman in Café Ultimo in northern Lumiose City.</li>
            <li><strong>ORAS:</strong> Black Belt near the Pokémon Center in Dewford Town.</li>
          </ul>
          <p>Secret Super Training unlocks when the Pokémon has maximum EVs and stays unlocked even if you later clear those EVs. Level does not matter, so this can be done at level 1. I recommend using enough Speed for movement and shot speed, enough bulk for blocking, and placing the remaining EVs in an attacking stat.</p>
        </>
      ),
    },
    {
      ribbonId: 'legend-ribbon',
      content: (
        <>
          <p>Defeat Red at the summit of Mt. Silver in HeartGold or SoulSilver. Every Pokémon in the party receives the Ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'earth-ribbon',
      content: (
        <>
          <p>In Pokémon Colosseum or Pokémon XD: Gale of Darkness, clear the Mt. Battle 100-Trainer challenge in Battle Mode without changing the registered party. The Ribbon is awarded to the Pokémon that complete the challenge.</p>
        </>
      ),
    },
    {
      ribbonId: 'national-ribbon',
      content: (
        <>
          <p>Purify a Shadow Pokémon in Pokémon Colosseum or Pokémon XD: Gale of Darkness. Non-Shadow Pokémon cannot obtain this Ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'hisui-ribbon',
      content: (
        <>
          <p>In Pokémon Legends: Arceus, visit Dagero's Photography Studio in Jubilife Village and choose "Prepare a Pokémon" with the Pokémon. Taking or saving the final photo is not required. The Ribbon is hidden in Legends: Arceus but appears after transfer to later games.</p>
        </>
      ),
    },
  ],
}

export default additionalRibbons
