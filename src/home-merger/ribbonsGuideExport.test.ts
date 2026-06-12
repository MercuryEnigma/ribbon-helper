import { describe, expect, it } from 'vitest';
import {
  createRibbonsGuideBackup,
  mapHomeLanguage,
  mapRibbonsGuideOrigin,
  mapRibbonsGuideSpecies,
  ribbonsGuideFilename,
  shouldShowJsonExport,
  validateRibbonsGuideDraft,
  type RibbonsGuideExportDraft,
} from './ribbonsGuideExport';

const VALID_DRAFT: RibbonsGuideExportDraft = {
  species: 'claydol',
  speciesName: 'Claydol',
  gender: 'unknown',
  shiny: '',
  nickname: 'Ribbondol',
  language: 'ENG',
  ball: 'premier',
  strangeBallDetected: false,
  level: 100,
  nature: 'bashful',
  trainerName: 'Gale',
  trainerId: '07071',
  origin: 'Gen 3',
  originPhrase: 'a distant land',
  ribbons: ['national-ribbon', 'jumbo-mark'],
};

describe('Ribbons.Guide mappings', () => {
  it('maps HOME language badges, including SPA', () => {
    expect(mapHomeLanguage('ENG')).toBe('en');
    expect(mapHomeLanguage('SPA')).toBe('es-es');
    expect(mapHomeLanguage('CHS')).toBe('zh-Hans');
  });

  it('maps the female Meowstic form to the shared Ribbons.Guide species ID', () => {
    expect(mapRibbonsGuideSpecies('meowstic-f')).toBe('meowstic');
  });

  it('uses safe origin values for ambiguous and exact phrases', () => {
    expect(mapRibbonsGuideOrigin('Gen 3', 'a distant land')).toEqual({
      originmark: 'none',
      origingame: null,
    });
    expect(mapRibbonsGuideOrigin('Switch', 'hisui region')).toEqual({
      originmark: 'hisui',
      origingame: 'pla',
    });
    expect(mapRibbonsGuideOrigin('VC', 'kanto region in the good old days'))
      .toEqual({ originmark: 'game-boy', origingame: 'vc' });
  });
});

describe('Ribbons.Guide validation and serialization', () => {
  it('preserves leading zeroes and emits a v5 standalone backup', () => {
    const backup = createRibbonsGuideBackup(VALID_DRAFT, 123456);

    expect(backup.fileVersion).toBe(5);
    expect(backup.lastModified).toBe(123456);
    expect(backup.boxes).toEqual([]);
    expect(backup.pokemon).toHaveLength(1);
    expect(backup.pokemon[0]).toMatchObject({
      species: 'claydol',
      nickname: 'Ribbondol',
      gender: 'unknown',
      language: 'en',
      ball: 'premier',
      currentlevel: 100,
      nature: 'bashful',
      trainername: 'Gale',
      trainerid: '07071',
      currentgame: 'home',
      metlevel: null,
      metdate: '',
      metlocation: '',
      shadow: true,
      scale: true,
    });
  });

  it('requires an original ball for a detected Strange Ball', () => {
    const result = validateRibbonsGuideDraft({
      ...VALID_DRAFT,
      ball: '',
      strangeBallDetected: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Select the original Poké Ball hidden by the Strange Ball.',
    );
  });

  it('rejects invalid Trainer IDs without losing valid leading zeroes', () => {
    expect(validateRibbonsGuideDraft({
      ...VALID_DRAFT,
      trainerId: '07A71',
    }).valid).toBe(false);
    expect(validateRibbonsGuideDraft(VALID_DRAFT).valid).toBe(true);
  });
});

describe('JSON UI helpers', () => {
  it('only enables export for an exact json=true parameter', () => {
    expect(shouldShowJsonExport(new URLSearchParams('json=true'))).toBe(true);
    expect(shouldShowJsonExport(new URLSearchParams('json=false'))).toBe(false);
    expect(shouldShowJsonExport(new URLSearchParams(''))).toBe(false);
  });

  it('uses the nickname and falls back to species for filenames', () => {
    expect(ribbonsGuideFilename('Ribbondol', 'Claydol'))
      .toBe('RibbonBackup-Ribbondol.json');
    expect(ribbonsGuideFilename('', 'Mr. Mime'))
      .toBe('RibbonBackup-Mr-Mime.json');
  });
});
