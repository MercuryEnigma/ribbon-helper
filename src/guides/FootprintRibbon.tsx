import type { Guide } from './guideTypes'

const footprintRibbon: Guide = {
  id: 'footprint-ribbon',
  title: 'Footprint Ribbon',
  description: (
    <>
      <p>The Footprint Ribbon is odd because its requirements changed between generations. Diamond, Pearl, and Platinum use maximum friendship. From X and Y onward, most Pokémon must gain 30 levels from their met level, with exceptions in Brilliant Diamond and Shining Pearl.</p>
      <p className="guide-warning"><strong>Transfer warning:</strong> I recommend obtaining this Ribbon in Diamond, Pearl, or Platinum before moving a level 71 or higher Pokémon from Generation IV to Generation V. Poké Transfer resets its met level to its current level, permanently preventing most species from gaining the 30 levels required in later games.</p>
    </>
  ),
  ribbonGuideEntries: [
    {
      ribbonId: 'footprint-ribbon',
      content: (
        <>
          <p>Awarded by an NPC to Pokémon that have formed a deep bond with their Trainer.</p>
          <h3>In Diamond, Pearl and Platinum</h3>
          <ul>
            <li>
              Show Dr. Footstep a Pokémon with maximum friendship.
              <ul>
                <li>These games are the safest place to obtain the Ribbon because it cannot be missed through leveling.</li>
              </ul>
            </li>
            <li>Location: Dr. Footstep's house on Route 213, near the entrance to Pastoria City.</li>
          </ul>
          <h3>In X, Y, Omega Ruby, Alpha Sapphire, Sun, Moon, Ultra Sun and Ultra Moon</h3>
          <ul>
            <li>
              Show the NPC a Pokémon that has gained at least 30 levels from its met level.
              <ul>
                <li>Pokémon met at level 71 or higher cannot qualify through leveling.</li>
              </ul>
            </li>
            <li>Kalos: a house west of the Pokémon Center in Shalour City.</li>
            <li>Hoenn: a house east of the Battle Maison on the Battle Resort.</li>
            <li>Alola: the lower-left corner inside Hano Grand Resort on Akala Island.</li>
          </ul>
          <h3>In Brilliant Diamond and Shining Pearl</h3>
          <ul>
            <li>
              The requirement depends on the Pokémon's species.
              <ul>
                <li>Most Pokémon must gain 30 levels from their met level, like the 3DS games.</li>
                <li>Due to a programming oversight, a small group of "voiceless Pokémon" receives it at maximum friendship instead.</li>
              </ul>
            </li>
            <li>Location: Dr. Footstep's house on Route 213, near the entrance to Pastoria City.</li>
          </ul>
          <h3>Met level lockouts</h3>
          <ul>
            <li>Met level is the level at which the Pokémon was caught, hatched, or received.</li>
            <li>From the Nintendo 3DS games onward, this data is retained during transfers.</li>
            <li><strong>If the Pokémon has entered Pokémon Bank or Pokémon HOME, its met level will not change.</strong></li>
            <li>
              Transfers from Generation III to IV and Generation IV to V reset met data and set the met level to the Pokémon's current level.
              <ul>
                <li>If it is level 71 or higher at that point, it can no longer qualify through leveling.</li>
              </ul>
            </li>
            <li>Virtual Console Pokémon transferred at level 71 or higher have the same problem unless they use the BDSP friendship exception.</li>
          </ul>
          <h3>Voiceless Pokémon</h3>
          <p>These Pokémon use friendship in Brilliant Diamond and Shining Pearl:</p>
          <ul className="voiceless-pokemon-list">
            <li>Metapod</li>
            <li>Kakuna</li>
            <li>Paras</li>
            <li>Parasect</li>
            <li>Venomoth</li>
            <li>Magnemite</li>
            <li>Magneton</li>
            <li>Magnezone</li>
            <li>Staryu</li>
            <li>Starmie</li>
            <li>Porygon</li>
            <li>Porygon2</li>
            <li>Porygon-Z</li>
            <li>Kabuto</li>
            <li>Xatu</li>
            <li>Unown</li>
            <li>Pineco</li>
            <li>Forretress</li>
            <li>Remoraid</li>
            <li>Pupitar</li>
            <li>Silcoon</li>
            <li>Cascoon</li>
            <li>Seedot</li>
            <li>Nincada</li>
            <li>Nosepass</li>
            <li>Probopass</li>
            <li>Lunatone</li>
            <li>Solrock</li>
            <li>Baltoy</li>
            <li>Claydol</li>
            <li>Lileep</li>
            <li>Cradily</li>
            <li>Anorith</li>
            <li>Shelgon</li>
            <li>Beldum</li>
            <li>Metang</li>
            <li>Regirock</li>
            <li>Regice</li>
            <li>Registeel</li>
            <li>Bronzor</li>
            <li>Bronzong</li>
            <li>Regigigas</li>
          </ul>
        </>
      ),
    },
  ],
}

export default footprintRibbon
