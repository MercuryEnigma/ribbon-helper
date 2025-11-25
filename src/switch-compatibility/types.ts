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
  gender: string;
  natdex?: number;
  games: string[];
  evolvesFrom?: string | null;
  femsprite?: boolean;
  flags?: string[];
  sort?: number;
}

export interface PokemonDatabase {
  [key: string]: PokemonData;
}

export type SwitchGame = 'lgp' | 'lge' | 'sw' | 'sh' | 'bd' | 'sp' | 'pla' | 'scar' | 'vio';

export interface SwitchGameInfo {
  id: SwitchGame;
  name: string;
}
