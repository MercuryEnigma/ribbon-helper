import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contest Spectaculars combo data from Bulbapedia
// Format: "first-move → second-move" means first-move comes before second-move
const COMBOS_DATA = `
force-palm → hex
force-palm → smelling-salts
agility → baton-pass
agility → electro-ball
focus-energy → blaze-kick
focus-energy → drill-run
focus-energy → karate-chop
focus-energy → night-slash
focus-energy → poison-tail
focus-energy → shadow-claw
focus-energy → stone-edge
stealth-rock → dragon-tail
stealth-rock → roar
stealth-rock → whirlwind
inferno → hex
will-o-wisp → hex
lovely-kiss → dream-eater
lovely-kiss → hex
lovely-kiss → nightmare
lovely-kiss → wake-up-slap
spore → dream-eater
spore → hex
spore → nightmare
spore → wake-up-slap
hail → blizzard
hail → glaciate
hail → icicle-crash
hail → icy-wind
hail → powder-snow
hail → weather-ball
mean-look → explosion
mean-look → memento
mean-look → perish-song
mean-look → self-destruct
rain-dance → hurricane
rain-dance → soak
rain-dance → thunder
rain-dance → water-sport
rain-dance → weather-ball
sunny-day → growth
sunny-day → moonlight
sunny-day → morning-sun
sunny-day → solar-beam
sunny-day → synthesis
sunny-day → weather-ball
celebrate → bestow
celebrate → fling
celebrate → present
covet → bestow
covet → fling
covet → present
happy-hour → bestow
happy-hour → fling
happy-hour → present
wish → bestow
wish → fling
wish → present
amnesia → baton-pass
amnesia → stored-power
hone-claws → baton-pass
hone-claws → stored-power
entrainment → circle-throw
entrainment → roar
entrainment → seismic-toss
entrainment → sky-drop
entrainment → smack-down
entrainment → storm-throw
entrainment → vital-throw
entrainment → wake-up-slap
play-nice → circle-throw
play-nice → roar
play-nice → seismic-toss
play-nice → sky-drop
play-nice → smack-down
play-nice → storm-throw
play-nice → vital-throw
play-nice → wake-up-slap
sing → dream-eater
sing → hex
sing → nightmare
sing → wake-up-slap
yawn → dream-eater
yawn → hex
yawn → nightmare
yawn → wake-up-slap
block → explosion
block → memento
block → perish-song
block → self-destruct
defense-curl → ice-ball
defense-curl → rollout
encore → counter
encore → destiny-bond
encore → grudge
encore → metal-burst
encore → mirror-coat
encore → spite
rest → sleep-talk
rest → snore
soft-boiled → egg-bomb
dark-void → dream-eater
dark-void → hex
dark-void → nightmare
dark-void → wake-up-slap
grass-whistle → dream-eater
grass-whistle → hex
grass-whistle → nightmare
grass-whistle → wake-up-slap
hypnosis → dream-eater
hypnosis → hex
hypnosis → nightmare
hypnosis → wake-up-slap
sleep-powder → dream-eater
sleep-powder → hex
sleep-powder → nightmare
sleep-powder → wake-up-slap
poison-gas → hex
poison-gas → venom-drench
poison-gas → venoshock
poison-powder → hex
poison-powder → venom-drench
poison-powder → venoshock
toxic → hex
toxic → venom-drench
toxic → venoshock
calm-mind → baton-pass
calm-mind → stored-power
nasty-plot → baton-pass
nasty-plot → stored-power
charge → charge-beam
charge → discharge
charge → electro-ball
charge → nuzzle
charge → parabolic-charge
charge → shock-wave
charge → spark
charge → thunder
charge → thunder-fang
charge → thunder-punch
charge → thunder-shock
charge → thunderbolt
charge → volt-switch
charge → volt-tackle
mind-reader → sheer-cold
parabolic-charge → electrify
shift-gear → gear-grind
spikes → dragon-tail
spikes → roar
spikes → whirlwind
string-shot → electroweb
string-shot → spider-web
string-shot → sticky-web
taunt → counter
taunt → destiny-bond
taunt → grudge
taunt → metal-burst
taunt → mirror-coat
taunt → spite
toxic-spikes → dragon-tail
toxic-spikes → hex
toxic-spikes → roar
toxic-spikes → venom-drench
toxic-spikes → venoshock
toxic-spikes → whirlwind
endure → endeavor
endure → flail
endure → pain-split
endure → reversal
glare → hex
glare → smelling-salts
rock-polish → baton-pass
rock-polish → electro-ball
rototiller → bullet-seed
rototiller → leech-seed
rototiller → seed-bomb
rototiller → worry-seed
sandstorm → sand-attack
sandstorm → sand-tomb
sandstorm → weather-ball
stockpile → spit-up
stockpile → swallow
torment → counter
torment → destiny-bond
torment → grudge
torment → metal-burst
torment → mirror-coat
torment → spite
`;

function parseCombos() {
  const combos = {};

  const lines = COMBOS_DATA.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*→\s*(.+)$/);
    if (!match) continue;

    const firstMove = match[1].trim();
    const secondMove = match[2].trim();

    // Initialize combo objects if they don't exist
    if (!combos[firstMove]) {
      combos[firstMove] = { before: new Set(), after: new Set() };
    }
    if (!combos[secondMove]) {
      combos[secondMove] = { before: new Set(), after: new Set() };
    }

    // first-move → second-move means:
    // - firstMove.combos.before includes secondMove
    // - secondMove.combos.after includes firstMove
    combos[firstMove].before.add(secondMove);
    combos[secondMove].after.add(firstMove);
  }

  // Convert Sets to sorted arrays
  const result = {};
  for (const [move, data] of Object.entries(combos)) {
    result[move] = {};
    if (data.before.size > 0) {
      result[move].before = Array.from(data.before).sort();
    }
    if (data.after.size > 0) {
      result[move].after = Array.from(data.after).sort();
    }
  }

  return result;
}

function updateContestMovesWithCombos() {
  console.log('Parsing combo data...');
  const combos = parseCombos();

  console.log(`Parsed combos for ${Object.keys(combos).length} moves`);

  // Load existing contest moves data
  const dataDir = path.resolve(__dirname, '..', 'src', 'data');
  const contestMovesPath = path.join(dataDir, 'contest_moves_oras.json');
  const contestMoves = JSON.parse(fs.readFileSync(contestMovesPath, 'utf8'));

  // Update moves with combo data
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundMoves = [];

  for (const [moveName, comboData] of Object.entries(combos)) {
    if (contestMoves[moveName]) {
      contestMoves[moveName].combos = comboData;
      updatedCount++;
    } else {
      notFoundCount++;
      notFoundMoves.push(moveName);
    }
  }

  // Write updated data
  fs.writeFileSync(contestMovesPath, JSON.stringify(contestMoves, null, 2));

  console.log(`\n✅ Updated ${updatedCount} moves with combo data`);
  console.log(`⚠️  ${notFoundCount} moves from combos not found in contest_moves_oras.json`);

  if (notFoundMoves.length > 0 && notFoundMoves.length <= 30) {
    console.log('\nNot found moves:');
    notFoundMoves.forEach(move => console.log(`  - ${move}`));
  }

  // Print some examples
  console.log('\n📝 Example combos added:');
  const exampleMoves = ['rest', 'yawn', 'charge', 'hail'].filter(m => contestMoves[m]?.combos);
  for (const move of exampleMoves) {
    console.log(`\n${move}:`);
    console.log(JSON.stringify(contestMoves[move].combos, null, 2));
  }
}

updateContestMovesWithCombos();
