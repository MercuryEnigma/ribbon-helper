export interface PokemonNames {
  en: string;
  'es-es': string;
  fr: string;
  de: string;
  it: string;
  ja: string;
  ko: string;
  'zh-Hans': string;
  'zh-Hant': string;
}

export interface PokemonData {
  names?: PokemonNames;
  forms?: PokemonNames;
  'data-source'?: string;
  'form-source'?: string;
  gender?: string;
  natdex?: number;
  games?: string[];
  evolvesFrom?: string | null;
  femsprite?: boolean;
  flags?: string[];
  sort?: number;
  mythical?: boolean;
  voiceless?: boolean;
}

export interface PokemonDatabase {
  [key: string]: PokemonData;
}

// Feature flag to optionally include Legends: Z-A data (persisted in localStorage)
export const ENABLE_PLZA: boolean = (() => {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem('enable_plza') === 'true';
  } catch {
    return false;
  }
})();

type BaseSwitchGame = 'lgp' | 'lge' | 'sw' | 'sh' | 'bd' | 'sp' | 'pla' | 'scar' | 'vio';
// Note: type includes plza; runtime gating is controlled by ENABLE_PLZA.
export type SwitchGame = BaseSwitchGame | 'plza';

export interface SwitchGameInfo {
  id: SwitchGame;
  name: string;
}

export interface GameTooltipDetail {
  header: string;
  body: string;
  isLastChance?: boolean;
}

export const GAME_TOOLTIPS: Record<'available' | 'shadow', Record<string, GameTooltipDetail>> = {
  available: {
    "Let's Go Pikachu / Eevee": {
      header: 'Transfer out only!',
      body: 'Pokemon can only originate from these games or be transfered via Go Park. Once a Pokemon transfers to another game, it cannot return to Let\'s Go Pikachu / Eevee. There are no ribbons.',
      isLastChance: true
    },
    'Legends: Z-A': {
      header: 'Transfer in only!',
      body: 'Once a Pokemon transfer into this game, it cannot return to any other Switch 1-era games. There are no ribbons.',
      isLastChance: true
    },
    'Sword / Shield': {
      header: 'Retains moves!',
      body: 'Retains moves when transferring from Bank or Let\'s Go Pikachu / Eevee. Has Galar Champion ribbon, Tower Master ribbon, and Master Rank ribbon. Tower Master ribbon is not restricted. Master Rank ribbon requires becoming "battle ready" which clears all moves.'
    },
    'Brilliant Diamond / Shining Pearl': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has Twinkling Star ribbon, Tower Master ribbon, and many Sinnoh ribbons. Tower Master ribbon is restricted.'
    },
    'Legends: Arceus': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has only Hisui ribbon.'
    },
    'Scarlet / Violet': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has Paldea Champion ribbon, Master Rank ribbon, and several earnable marks.'
    }
  },
  shadow: {
    "Let's Go Pikachu / Eevee": {
      header: 'Transfer out only!',
      body: 'Shadow Pokemon cannot transfer to Let\'s Go Pikachu / Eevee. There are no ribbons.',
      isLastChance: true
    },
    'Legends: Z-A': {
      header: 'Transfer in only!',
      body: 'Once a Pokemon transfer into this game, it cannot return to any other Switch 1-era games. There are no ribbons.',
      isLastChance: true
    },
    'Sword / Shield': {
      header: 'Retains moves!',
      body: 'Retains moves (including special purification moves) when transferring from Bank. Has Galar Champion ribbon, Tower Master ribbon, and Master Rank ribbon. Tower Master ribbon is not restricted. Master Rank ribbon requires becoming "battle ready" which clears all moves.'
    },
    'Brilliant Diamond / Shining Pearl': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has Twinkling Star ribbon, Tower Master ribbon, and many Sinnoh ribbons. Tower Master ribbon is restricted.'
    },
    'Legends: Arceus': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has only Hisui ribbon.'
    },
    'Scarlet / Violet': {
      header: 'Clears moves',
      body: 'Moves are reset when transferring in. Has Paldea Champion ribbon, Master Rank ribbon, and several earnable marks.'
    },
    'Colosseum': {
      header: 'Shiny Shadow Pokemon possible!',
      body: 'These shadow pokemon can be shiny. Shininess is revealed after you catch them, now when the trainer send it out. No special purification moves.'
    },
    'XD: Gale of Darkness': {
      header: 'Special purification moves!',
      body: 'These shadow pokemon have special moves upon purification that they normally cannot learn. Shiny-locked.'
    },
    'Either': {
      header: 'Shared Pokemon',
      body: 'Makuhita and Togepi can both be captured in either game. Togepi is Japanese e-reader exclusive. The rest are exclusive to one game or the other, though some have shared evolutionary lines.'
    }
  }
};
