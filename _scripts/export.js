var MEGA_STONE_LOOKUP = {
	"Mega Venusaur": "Venusaurite",
	"Mega Charizard X": "Charizardite X",
	"Mega Charizard Y": "Charizardite Y",
	"Mega Blastoise": "Blastoisinite",
	"Mega Alakazam": "Alakazite",
	"Mega Gengar": "Gengarite",
	"Mega Kangaskhan": "Kangaskhanite",
	"Mega Pinsir": "Pinsirite",
	"Mega Gyarados": "Gyaradosite",
	"Mega Aerodactyl": "Aerodactylite",
	"Mega Mewtwo X": "Mewtwonite X",
	"Mega Mewtwo Y": "Mewtwonite Y",
	"Mega Ampharos": "Ampharosite",
	"Mega Scizor": "Scizorite",
	"Mega Heracross": "Heracronite",
	"Mega Houndoom": "Houndoominite",
	"Mega Tyranitar": "Tyranitarite",
	"Mega Blaziken": "Blazikenite",
	"Mega Gardevoir": "Gardevoirite",
	"Mega Mawile": "Mawilite",
	"Mega Aggron": "Aggronite",
	"Mega Medicham": "Medichamite",
	"Mega Manectric": "Manectite",
	"Mega Banette": "Banettite",
	"Mega Absol": "Absolite",
	"Mega Latias": "Latiasite",
	"Mega Latios": "Latiosite",
	"Mega Garchomp": "Garchompite",
	"Mega Lucario": "Lucarionite",
	"Mega Abomasnow": "Abomasite",
	"Mega Beedrill": "Beedrillite",
	"Mega Pidgeot": "Pidgeotite",
	"Mega Slowbro": "Slowbronite",
	"Mega Steelix": "Steelixite",
	"Mega Sceptile": "Sceptilite",
	"Mega Swampert": "Swampertite",
	"Mega Sableye": "Sablenite",
	"Mega Sharpedo": "Sharpedonite",
	"Mega Camerupt": "Cameruptite",
	"Mega Altaria": "Altarianite",
	"Mega Glalie": "Glalitite",
	"Mega Salamence": "Salamencite",
	"Mega Metagross": "Metagrossite",
	"Mega Lopunny": "Lopunnite",
	"Mega Gallade": "Galladite",
	"Mega Audino": "Audinite",
	"Mega Diancie": "Diancite"
};

function exportToPsFormat(pokeInfo) {
	var pokemon = new Pokemon(pokeInfo);
	var finalText = "";
	var evSum = 0;
	var ivSum = 0;
	var evsAlert = false;
	var name = pokemon.name;
	if (name.indexOf("Mega ") != -1) {
		var speciesName = name.substring(name.indexOf("Mega ") + 5, name.length);
		if (speciesName.indexOf(" X") == speciesName.length - 2) {
			speciesName = speciesName.substring(0, speciesName.length - 2) + "-Mega-X";
		}
		else if (speciesName.indexOf(" Y") == speciesName.length - 2) {
			speciesName = speciesName.substring(0, speciesName.length - 2) + "-Mega-Y";
		}
		else {
			speciesName += "-Mega";
		}
		if (speciesName !== "Rayquaza-Mega") {
			pokemon.item = MEGA_STONE_LOOKUP[name];
		}
	} else {
		var speciesName = name;
	}

	// convert items that have old names in old gens
	let item = pokemon.item;
	if (gen < 6 && item) {
		for (let [oldName, newName] of Object.entries(oldItemNames)) {
			if (item === newName) {
				item = oldName;
				break;
			}
		}
	}
	finalText = speciesName + (item ? " @ " + item : "") + "\n";
	finalText += pokemon.ability ? "Ability: " + pokemon.ability + "\n" : "";
	finalText += pokemon.level !== 50 || gen == 3 || gen == 4 ? "Level: " + pokemon.level + "\n" : "";
	finalText += pokemon.teraType ? "Tera Type: " + pokemon.teraType + "\n" : "";
	finalText += pokemon.nature && gen > 2 ? pokemon.nature + " Nature" + "\n" : "";
	finalText += "EVs: ";
	var EVs_Array = [];
	if (pokemon.HPEVs && pokemon.HPEVs > 0) {
		evSum += pokemon.HPEVs;
		EVs_Array.push(pokemon.HPEVs + " HP");
	}
	for (stat in pokemon.evs) {
		if (pokemon.evs[stat]) {
			evSum += pokemon.evs[stat];
			EVs_Array.push(pokemon.evs[stat] + " " + toSmogonStat(stat));
		}
	}
	if (evSum > 510) {
		evsAlert = true;
	}

	var ivArray = [];
	var IVs_Array = [];
	if (pokemon.HPIVs != -1) {
		ivSum += pokemon.HPIVs;
		//IVs_Array.push(pokemon.HPIVs + " HP");
		if (pokemon.HPIVs != 31) {
			ivArray.push(pokemon.HPIVs + " HP");
		}
	}
	for (stat in pokemon.ivs) {
		if (pokemon.ivs[stat]) {
			ivSum += pokemon.ivs[stat];
		}
		if (pokemon.ivs[stat] < 31) {
			ivArray.push(pokemon.ivs[stat] + " " + toSmogonStat(stat));
		}
	}

	for (var i = 0; i < ivArray.length - 2; i++) {
		IVs_Array.push(ivArray[i]);
	}

	finalText += serialize(EVs_Array, " / ");
	finalText += "\n";

	if (ivSum < 186) {
		finalText += "IVs: ";
		finalText += serialize(IVs_Array, " / ");
		finalText += "\n";
	}

	var movesArray = [];
	for (i = 0; i < 4; i++) {
		var moveName = pokemon.baseMoveNames[i];
		if (moveName !== "(No Move)") {
			finalText += "- " + moveName + "\n";
		}
	}
	finalText = finalText.trim();

	if (evsAlert === true) {
		alert("Exported Pokemon has " + evSum + " EVs and is therefore illegal. Exported set anyway.");
	}

	$("#customMon").val(finalText).select();
}

function serialize(array, separator) {
	var text = "";
	for (i = 0; i < array.length; i++) {
		if (i < array.length - 1) {
			text += array[i] + separator;
		} else {
			text += array[i];
		}
	}
	return text;
}