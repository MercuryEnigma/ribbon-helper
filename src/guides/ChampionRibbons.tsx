import type { Guide } from './guideTypes'

const championRibbons: Guide = {
  id: 'champion-ribbons',
  title: 'Champion Ribbons',
  description: 'Every Pokémon in the party receives the regional Champion Ribbon, even if it never enters battle. HeartGold and SoulSilver do not award a Champion Ribbon for clearing their Pokémon League.',
  ribbonGuideEntries: [
    {
      ribbonId: 'champion-ribbon',
      content: (
        <>
          <p>Enter the Hall of Fame in Ruby, Sapphire, Emerald, FireRed, or LeafGreen. The Ribbon is obtained in FireRed and LeafGreen even though those games cannot display it.</p>
        </>
      ),
    },
    {
      ribbonId: 'sinnoh-champion-ribbon',
      content: (
        <>
          <p>Enter the Sinnoh Hall of Fame in Diamond, Pearl, Platinum, Brilliant Diamond, or Shining Pearl by defeating the Elite Four and Cynthia. This is the only regional Champion Ribbon that returned in a later generation.</p>
        </>
      ),
    },
    {
      ribbonId: 'kalos-champion-ribbon',
      content: (
        <>
          <p>Enter the Kalos Hall of Fame in X or Y by defeating the Elite Four and Diantha.</p>
        </>
      ),
    },
    {
      ribbonId: 'hoenn-champion-ribbon',
      content: (
        <>
          <p>Enter the Hoenn Hall of Fame in Omega Ruby or Alpha Sapphire. This is a different Ribbon from the Generation III Champion Ribbon.</p>
        </>
      ),
    },
    {
      ribbonId: 'alola-champion-ribbon',
      content: (
        <>
          <p>Clear the Alola Pokémon League in Sun, Moon, Ultra Sun, or Ultra Moon. The first Champion opponent differs by game; later clears use a title-defense challenger.</p>
        </>
      ),
    },
    {
      ribbonId: 'galar-champion-ribbon',
      content: (
        <>
          <p>Win the Champion Cup in Sword or Shield. After the story, obtain the ribbon from the single-battle Champion Cup rematch at Wyndon Stadium.</p>
          <ul><li>The Galarian Star Tournament does not award this Ribbon.</li></ul>
        </>
      ),
    },
    {
      ribbonId: 'paldea-champion-ribbon',
      content: (
        <>
          <p>Complete the Champion Assessment by defeating Geeta. After completing the base-game story and postgame quests, obtain the ribbon by winning the Academy Ace Tournament.</p>
        </>
      ),
    },
  ],
}

export default championRibbons
