import type { Guide } from './guideTypes'

const earnableMarks: Guide = {
  id: 'earnable-marks',
  title: 'Earnable Marks',
  description: 'These Scarlet and Violet Marks can be added to an eligible Pokémon after it is obtained. The Mark Charm and Title Power do not improve these acquisition checks.',
  ribbonGuideEntries: [
    {
      ribbonId: 'gourmand-mark',
      content: (
        <>
          <p>After making a sandwich or buying food, each Pokémon in the party has a 3/101 chance to receive the Mark. Repeatedly buying a cheap, fast meal is the most efficient method.</p>
        </>
      ),
    },
    {
      ribbonId: 'partner-mark',
      content: (
        <>
          <p>Each party Pokémon with <strong>at least 200 friendship</strong> receives a 1/100 Mark check every 10,000 player steps. It does not need to be outside its Poké Ball.</p>
          <ul>
            <li>Koraidon or Miraidon must be in the party rather than being ridden if it is receiving the Mark. The ride Pokémon can only obtain it while in battle form.</li>
            <li>I recommend running continuously in a safe open area such as the Cortondo Olive Roll field. A rubber band around both control sticks can automate the movement.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'itemfinder-mark',
      content: (
        <>
          <p>From version 2.0.1 onward, the lead Pokémon has a 1/100 chance to receive the Mark every time it picks up an overworld item in Let's Go mode.</p>
          <ul><li>The Pokémon must perform the pickup itself. Pickups made while controlling it with the Synchro Machine do not qualify.</li></ul>
        </>
      ),
    },
    {
      ribbonId: 'jumbo-mark',
      content: (
        <>
          <p>Show a Pokémon with the maximum Scale value of 255 to the Hiker near the Mesagoza (West) Pokémon Center.</p>
          <ul>
            <li>The normal unboosted chance is 1/16,512. Pokémon with the Alpha or Titan Mark are guaranteed to qualify, and wild Tera Pokémon have a 1/56 chance because their Scale is restricted to 200-255.</li>
            <li>Humungo Power improves the chance to 1/128 at Lv. 1, 1/96 at Lv. 2, and 1/32 at Lv. 3.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'mini-mark',
      content: (
        <>
          <p>Show a Pokémon with the minimum Scale value of 0 to the Hiker near the Mesagoza (West) Pokémon Center.</p>
          <ul>
            <li>The normal unboosted chance is 1/16,512. Former Titan and wild Tera Pokémon cannot qualify because their Scale cannot be 0.</li>
            <li>Teensy Power improves the chance to 1/128 at Lv. 1, 1/96 at Lv. 2, and 1/32 at Lv. 3.</li>
          </ul>
        </>
      ),
    },
  ],
}

export default earnableMarks
