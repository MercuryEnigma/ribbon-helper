import pokemonData from '../data/pokemon.json';
import ribbonsData from '../data/ribbons.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import { BALL_IDS } from './ballMatcher';
import type { HomeOrigin } from './originParser';
import {
  NATURE_NAMES,
  sanitizeForFilename,
  type HomeGender,
  type HomeLanguage,
  type HomeNature,
} from './summaryDetails';

export type RibbonsGuideShiny = '' | 'star' | 'square';

export interface RibbonsGuidePokemon {
  species: string;
  gender: HomeGender;
  shiny: RibbonsGuideShiny;
  nickname: string;
  language: string;
  ball: string;
  strangeball: '' | 'enabled' | 'disabled';
  currentlevel: number;
  nature: HomeNature | '';
  totem: boolean;
  gmax: boolean;
  shadow: boolean;
  trainername: string;
  trainerid: string;
  originmark: string;
  origingame: string | null;
  currentgame: 'home';
  box: number;
  title: 'None';
  scale: boolean;
  ribbons: string[];
  metlevel: number | null;
  metdate: string;
  metlocation: string;
  pokerus: string;
  achievements: string[];
  notes: string;
}

export interface RibbonsGuideSettings {
  theme: 'auto';
  language: 'en';
  ChecklistButtons: 'always';
  TitleRibbon: 'always';
  OldRibbons: 'unmerged';
  ExtraOriginMarks: 'none';
  CardView: 'expanded';
  RibbonFormView: 'list';
  ShowWorldAbility: 'false';
  AutoMemoryRibbons: 'true';
  AutoStrangeBall: 'true';
  FooterExtraInfo: 'true';
  CompleteColor: 'true';
  IllegalTitles: 'false';
  Reordering: 'true';
  NewChangelogs: 'true';
  AprilFools: 'true';
}

export interface RibbonsGuideBackupV5 {
  fileVersion: 5;
  lastModified: number;
  settings: RibbonsGuideSettings;
  pokemon: RibbonsGuidePokemon[];
  boxes: string[];
}

export interface RibbonsGuideExportDraft {
  species: string;
  speciesName: string;
  gender: HomeGender | '';
  shiny: RibbonsGuideShiny;
  nickname: string;
  language: HomeLanguage | '';
  ball: string;
  strangeBallDetected: boolean;
  level: number;
  nature: HomeNature | '';
  trainerName: string;
  trainerId: string;
  origin: HomeOrigin | '';
  originPhrase: string | null;
  ribbons: string[];
}

export interface RibbonsGuideValidation {
  valid: boolean;
  errors: string[];
}

export const RIBBONS_GUIDE_SETTINGS: RibbonsGuideSettings = {
  theme: 'auto',
  language: 'en',
  ChecklistButtons: 'always',
  TitleRibbon: 'always',
  OldRibbons: 'unmerged',
  ExtraOriginMarks: 'none',
  CardView: 'expanded',
  RibbonFormView: 'list',
  ShowWorldAbility: 'false',
  AutoMemoryRibbons: 'true',
  AutoStrangeBall: 'true',
  FooterExtraInfo: 'true',
  CompleteColor: 'true',
  IllegalTitles: 'false',
  Reordering: 'true',
  NewChangelogs: 'true',
  AprilFools: 'true',
};

const POKEMON_DB = pokemonData as PokemonDatabase;
const RIBBON_IDS = new Set(Object.keys(ribbonsData));
const BALL_ID_SET = new Set(BALL_IDS);
const SIZE_MARKS = new Set([
  'mini-mark',
  'jumbo-mark',
  'titan-mark',
  'alpha-mark',
]);

const LANGUAGE_IDS: Record<HomeLanguage, string> = {
  JPN: 'ja',
  ENG: 'en',
  FRE: 'fr',
  GER: 'de',
  ITA: 'it',
  SPA: 'es-es',
  KOR: 'ko',
  CHS: 'zh-Hans',
  CHT: 'zh-Hant',
};

const SPECIES_ID_OVERRIDES: Record<string, string> = {
  'meowstic-f': 'meowstic',
};

export function shouldShowJsonExport(searchParams: URLSearchParams): boolean {
  return searchParams.get('json') === 'true';
}

export function mapHomeLanguage(language: HomeLanguage): string {
  return LANGUAGE_IDS[language];
}

export function mapRibbonsGuideSpecies(species: string): string {
  return SPECIES_ID_OVERRIDES[species] ?? species;
}

export function mapRibbonsGuideOrigin(
  origin: HomeOrigin | '',
  matchedPhrase: string | null,
): { originmark: string; origingame: string | null } {
  const phrase = matchedPhrase?.toLowerCase() ?? '';

  if (origin === 'VC') {
    return { originmark: 'game-boy', origingame: 'vc' };
  }
  if (origin === 'GO') {
    return { originmark: 'go', origingame: 'go' };
  }
  if (origin === 'PLZA') {
    return { originmark: 'plza', origingame: 'plza' };
  }
  if (phrase.includes('galar region')) {
    return { originmark: 'galar', origingame: 'swsh' };
  }
  if (phrase.includes('hisui region')) {
    return { originmark: 'hisui', origingame: 'pla' };
  }
  if (phrase.includes('paldea region')) {
    return { originmark: 'paldea', origingame: 'sv' };
  }
  if (phrase.includes('kalos region')) {
    return { originmark: 'pentagon', origingame: 'xy' };
  }
  if (phrase.includes('alola region')) {
    return { originmark: 'clover', origingame: null };
  }

  if (origin === 'Gen 3' || origin === 'Gen 4' || origin === 'Gen 5') {
    return { originmark: 'none', origingame: null };
  }
  if (origin === 'Gen 6') {
    return { originmark: 'pentagon', origingame: null };
  }
  if (origin === 'Gen 7') {
    return { originmark: 'clover', origingame: null };
  }
  return { originmark: '', origingame: null };
}

export function validateRibbonsGuideDraft(
  draft: RibbonsGuideExportDraft,
): RibbonsGuideValidation {
  const errors: string[] = [];
  const mappedSpecies = mapRibbonsGuideSpecies(draft.species);

  if (!draft.species || !POKEMON_DB[draft.species]) {
    errors.push('Select a supported Pokémon.');
  } else if (!POKEMON_DB[mappedSpecies]) {
    errors.push('The selected form cannot be exported to Ribbons.Guide.');
  }
  if (!draft.gender) errors.push('Select a gender.');
  if (!draft.language) errors.push('Select a language.');
  if (!draft.ball || !BALL_ID_SET.has(draft.ball) || draft.ball === 'strange') {
    errors.push(
      draft.strangeBallDetected
        ? 'Select the original Poké Ball hidden by the Strange Ball.'
        : 'Select a Poké Ball.',
    );
  }
  if (!Number.isInteger(draft.level) || draft.level < 1 || draft.level > 100) {
    errors.push('Level must be from 1 to 100.');
  }
  if (draft.trainerId && !/^\d{1,6}$/.test(draft.trainerId)) {
    errors.push('ID No. must contain one to six digits.');
  }
  if (draft.nature && !(draft.nature in NATURE_NAMES)) {
    errors.push('Select a valid nature.');
  }

  const invalidRibbon = draft.ribbons.find(ribbonId => !RIBBON_IDS.has(ribbonId));
  if (invalidRibbon) {
    errors.push(`Unsupported ribbon or mark: ${invalidRibbon}.`);
  }

  return { valid: errors.length === 0, errors };
}

export function createRibbonsGuidePokemon(
  draft: RibbonsGuideExportDraft,
): RibbonsGuidePokemon {
  const validation = validateRibbonsGuideDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const origin = mapRibbonsGuideOrigin(draft.origin, draft.originPhrase);
  const normalizedNickname = draft.nickname.trim();
  const nickname = normalizedNickname.localeCompare(
    draft.speciesName.trim(),
    undefined,
    { sensitivity: 'accent' },
  ) === 0 ? '' : normalizedNickname;

  return {
    species: mapRibbonsGuideSpecies(draft.species),
    gender: draft.gender as HomeGender,
    shiny: draft.shiny,
    nickname,
    language: mapHomeLanguage(draft.language as HomeLanguage),
    ball: draft.ball,
    strangeball: draft.strangeBallDetected ? 'enabled' : '',
    currentlevel: draft.level,
    nature: draft.nature,
    totem: false,
    gmax: false,
    shadow: draft.ribbons.includes('national-ribbon'),
    trainername: draft.trainerName.trim(),
    trainerid: draft.trainerId,
    originmark: origin.originmark,
    origingame: origin.origingame,
    currentgame: 'home',
    box: -1,
    title: 'None',
    scale: draft.ribbons.some(ribbonId => SIZE_MARKS.has(ribbonId)),
    ribbons: [...new Set(draft.ribbons)],
    metlevel: null,
    metdate: '',
    metlocation: '',
    pokerus: '',
    achievements: [],
    notes: '',
  };
}

export function createRibbonsGuideBackup(
  draft: RibbonsGuideExportDraft,
  lastModified = Date.now(),
): RibbonsGuideBackupV5 {
  return {
    fileVersion: 5,
    lastModified,
    settings: { ...RIBBONS_GUIDE_SETTINGS },
    pokemon: [createRibbonsGuidePokemon(draft)],
    boxes: [],
  };
}

export function serializeRibbonsGuideBackup(
  draft: RibbonsGuideExportDraft,
  lastModified = Date.now(),
): string {
  return JSON.stringify(createRibbonsGuideBackup(draft, lastModified), null, 2);
}

export function ribbonsGuideFilename(
  nickname: string,
  speciesName: string,
): string {
  const base = sanitizeForFilename(nickname) || sanitizeForFilename(speciesName);
  return `RibbonBackup-${base || 'Pokemon'}.json`;
}
