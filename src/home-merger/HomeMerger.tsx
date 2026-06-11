import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDES } from '../guides/guideRegistry';
import pokemonData from '../data/pokemon.json';
import ribbonsData from '../data/ribbons.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import { getAvailableRibbons } from '../switch-compatibility/ribbonUtils';
import { mergeAll } from './ocrMerge';
import { loadFileToCanvas, canvasToBlob } from './imageUtils';
import {
  analyzeHomeSummary,
  type HomeRecognitionResult,
} from './homeAnalysis';
import {
  classifyRibbonCollection,
  type EligibleRibbon,
  type RibbonCollectionAnalysis,
} from './ribbonAnalysis';
import {
  getFormOptions,
  type PokemonIdentityCandidate,
} from './pokemonIdentity';
import { HOME_ORIGINS, type HomeOrigin } from './originParser';
import firstScreenshot from '../../home-images/ribbondol/IMG_8750.PNG';
import secondScreenshot from '../../home-images/ribbondol/IMG_8751.PNG';
import thirdScreenshot from '../../home-images/ribbondol/IMG_8752.PNG';
import mergedScreenshot from '../../home-images/ribbondol-home.PNG';
import '../guides/guides.css';
import './home-merger.css';

type MergerState =
  | { type: 'idle' }
  | { type: 'ready'; files: File[] }
  | { type: 'processing'; step: number; total: number; detail: string }
  | { type: 'done'; url: string; filename: string; canvas: HTMLCanvasElement }
  | { type: 'error'; message: string };

type AnalysisState =
  | { type: 'idle' }
  | { type: 'processing'; detail: string; progress: number }
  | { type: 'done'; result: HomeRecognitionResult }
  | { type: 'error'; message: string };

interface RibbonMetadata {
  names?: { en?: string };
  descs?: { en?: string };
}

const POKEMON_DB = pokemonData as PokemonDatabase;
const RIBBONS = ribbonsData as Record<string, RibbonMetadata>;
const SPECIES_OPTIONS = Object.entries(POKEMON_DB)
  .filter(([, data]) => !data['data-source'] && data.names?.en && data.natdex)
  .map(([pokemonKey, data]) => ({
    pokemonKey,
    name: data.names!.en,
    dexNumber: data.natdex!,
  }))
  .sort((a, b) => a.dexNumber - b.dexNumber);

export default function HomeMerger() {
  const navigate = useNavigate();
  const [state, setState] = useState<MergerState>({ type: 'idle' });
  const [analysis, setAnalysis] = useState<AnalysisState>({ type: 'idle' });
  const [selectedBaseKey, setSelectedBaseKey] = useState('');
  const [selectedFormKey, setSelectedFormKey] = useState('auto');
  const [level, setLevel] = useState(50);
  const [origin, setOrigin] = useState<HomeOrigin | ''>('');
  const [cellSelections, setCellSelections] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const analysisRunRef = useRef(0);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length < 2) return;
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    setState({ type: 'ready', files: sorted });
  }, []);

  const handleAnalyze = useCallback(async (canvas: HTMLCanvasElement) => {
    const run = ++analysisRunRef.current;
    setAnalysis({
      type: 'processing',
      detail: 'Finding the ribbon grid',
      progress: 0,
    });

    try {
      const result = await analyzeHomeSummary(
        canvas,
        (_stage, detail, progress) => {
          if (analysisRunRef.current === run) {
            setAnalysis({ type: 'processing', detail, progress });
          }
        },
      );
      if (analysisRunRef.current !== run) return;

      const bestIdentity = result.identity.candidates[0];
      setSelectedBaseKey(bestIdentity?.baseKey ?? '');
      setSelectedFormKey('auto');
      setLevel(result.identity.recognizedLevel ?? 50);
      setOrigin(result.origin.origin ?? '');
      setCellSelections(result.ribbonMatches.map(match => (
        match.accepted ? match.best.ribbonId : ''
      )));
      setAnalysis({ type: 'done', result });
    } catch (error) {
      if (analysisRunRef.current !== run) return;
      setAnalysis({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const handleMerge = useCallback(async (files: File[]) => {
    setState({ type: 'processing', step: 0, total: files.length - 1, detail: 'Loading images…' });
    setAnalysis({ type: 'idle' });

    try {
      const canvases = await Promise.all(files.map(loadFileToCanvas));

      const merged = await mergeAll(canvases, (step, total, detail) => {
        setState({ type: 'processing', step, total, detail });
      });

      const blob = await canvasToBlob(merged);
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setState({ type: 'done', url, filename: 'merged-home.PNG', canvas: merged });
      void handleAnalyze(merged);
    } catch (err) {
      setState({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [handleAnalyze]);

  const reset = useCallback(() => {
    analysisRunRef.current++;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setState({ type: 'idle' });
    setAnalysis({ type: 'idle' });
    setSelectedBaseKey('');
    setSelectedFormKey('auto');
    setOrigin('');
    setCellSelections([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const formOptions = useMemo(
    () => selectedBaseKey ? getFormOptions(selectedBaseKey, POKEMON_DB) : [],
    [selectedBaseKey],
  );
  const selectedPokemonKey = (
    selectedFormKey === 'auto' ? selectedBaseKey : selectedFormKey
  );
  const detectedRibbonIds = useMemo(
    () => cellSelections.filter(Boolean),
    [cellSelections],
  );
  const collectionAnalysis = useMemo<RibbonCollectionAnalysis | null>(() => {
    if (
      analysis.type !== 'done'
      || !selectedPokemonKey
      || !origin
    ) {
      return null;
    }

    const isShadow = detectedRibbonIds.includes('national-ribbon');
    const eligible = getAvailableRibbons(
      selectedPokemonKey,
      level,
      origin,
      isShadow,
      POKEMON_DB,
    );
    return classifyRibbonCollection(eligible, detectedRibbonIds);
  }, [
    analysis.type,
    detectedRibbonIds,
    level,
    origin,
    selectedPokemonKey,
  ]);

  return (
    <div className="guides-wrapper">
      <div className="trainer-card">
        <div className="trainer-card-header">
          <span className="trainer-card-pokeball" aria-hidden="true" />
          <select
            className="trainer-card-selector"
            value="stitching"
            onChange={event => navigate(`/guides/${event.target.value}`)}
            aria-label="Select ribbon guide"
          >
            {GUIDES.map(guide => (
              <option key={guide.id} value={guide.id}>{guide.title}</option>
            ))}
            <option value="stitching">Ribbon Checker</option>
          </select>
          <span className="trainer-card-pokeball" aria-hidden="true" />
        </div>
        <div className="trainer-card-body">
          <div className="trainer-card-info">
            <p className="guide-description">
              Take several overlapping screenshots of a Pokémon's summary in the
              Pokémon HOME mobile app, then upload them together to create one unified image
              and check its ribbons.
            </p>
            <div className="trainer-card-divider" />

            <section className="home-merger__instructions" aria-labelledby="stitching-instructions">
              <h2 id="stitching-instructions" className="home-merger__instructions-title">
                How to use the Ribbon Checker
              </h2>
              <ol className="home-merger__steps">
                <li className="home-merger__step">
                  <div className="home-merger__step-copy">
                    <span className="home-merger__step-number" aria-hidden="true">1</span>
                    <div>
                      <h3>Take the first screenshot</h3>
                      <p>
                        Open the Pokémon's summary in the Pokémon HOME mobile app and take
                        a screenshot at the top of the page.
                      </p>
                    </div>
                  </div>
                  <ExampleImage
                    src={firstScreenshot}
                    filename="IMG_8750.PNG"
                    alt="First Pokémon HOME summary screenshot at the top of the page"
                  />
                </li>

                <li className="home-merger__step">
                  <div className="home-merger__step-copy">
                    <span className="home-merger__step-number" aria-hidden="true">2</span>
                    <div>
                      <h3>Scroll down and take more screenshots</h3>
                      <p>
                        Leave some content from the previous screenshot visible each time.
                        This overlap lets the tool find where the images belong.
                      </p>
                    </div>
                  </div>
                  <div className="home-merger__example-grid home-merger__example-grid--two">
                    <ExampleImage
                      src={secondScreenshot}
                      filename="IMG_8751.PNG"
                      alt="Second overlapping Pokémon HOME summary screenshot"
                    />
                    <ExampleImage
                      src={thirdScreenshot}
                      filename="IMG_8752.PNG"
                      alt="Third overlapping Pokémon HOME summary screenshot"
                    />
                  </div>
                </li>

                <li className="home-merger__step">
                  <div className="home-merger__step-copy">
                    <span className="home-merger__step-number" aria-hidden="true">3</span>
                    <div>
                      <h3>Upload every screenshot at once</h3>
                      <p>
                        Tap the file picker below and select all screenshots in one selection.
                        They are sorted by filename, so keep them in the order they were taken.
                      </p>
                    </div>
                  </div>
                  <div className="home-merger__upload-example" aria-label="Three screenshots selected together">
                    {[firstScreenshot, secondScreenshot, thirdScreenshot].map((src, index) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="home-merger__upload-thumbnail"
                        style={{ zIndex: 3 - index }}
                      />
                    ))}
                    <span>3 screenshots selected together</span>
                  </div>
                </li>

                <li className="home-merger__step">
                  <div className="home-merger__step-copy">
                    <span className="home-merger__step-number" aria-hidden="true">4</span>
                    <div>
                      <h3>Merge, check, and download</h3>
                      <p>
                        Select Merge to create the unified image. The checker reads the
                        Pokémon and origin, then identifies ribbons from their fixed Pokémon
                        HOME order and surrounding icons. It reports owned, remaining, missed,
                        and special extra ribbons or marks, including Jumbo and Mini size marks.
                        You can still edit a result if the screenshot was unusual, then download
                        the finished image.
                      </p>
                    </div>
                  </div>
                  <ExampleImage
                    src={mergedScreenshot}
                    filename="ribbondol-home.PNG"
                    alt="Completed unified Pokémon HOME summary image"
                    result
                  />
                </li>
              </ol>
            </section>

            <div className="trainer-card-divider" />

            {state.type === 'idle' && (
              <label className="home-merger__dropzone">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,.png,.PNG"
                  onChange={e => handleFiles(e.target.files)}
                  className="home-merger__file-input"
                />
                <span className="home-merger__dropzone-icon" aria-hidden="true">📁</span>
                <span className="home-merger__dropzone-text">Select all screenshots at once</span>
                <span className="home-merger__dropzone-hint">2 or more PNG screenshots required</span>
              </label>
            )}

            {state.type === 'ready' && (
              <div className="home-merger__ready">
                <p className="home-merger__file-count">{state.files.length} files selected (sorted by name):</p>
                <ol className="home-merger__file-list">
                  {state.files.map(f => (
                    <li key={f.name} className="home-merger__file-item">{f.name}</li>
                  ))}
                </ol>
                <div className="home-merger__actions">
                  <button
                    onClick={() => handleMerge(state.files)}
                    className="home-merger__btn home-merger__btn--primary"
                  >
                    Merge
                  </button>
                  <button onClick={reset} className="home-merger__btn">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {state.type === 'processing' && (
              <div className="home-merger__processing">
                <progress
                  className="home-merger__progress"
                  value={state.step}
                  max={state.total}
                />
                <p className="home-merger__status">{state.detail}</p>
              </div>
            )}

            {state.type === 'done' && (
              <div className="home-merger__done">
                <img
                  src={state.url}
                  alt="Merged Pokémon HOME screenshot"
                  className="home-merger__preview"
                />
                <div className="home-merger__actions">
                  <a
                    href={state.url}
                    download={state.filename}
                    className="home-merger__btn home-merger__btn--primary"
                  >
                    Download {state.filename}
                  </a>
                  <button onClick={reset} className="home-merger__btn">
                    Start over
                  </button>
                </div>
                <AnalysisPanel
                  state={analysis}
                  selectedBaseKey={selectedBaseKey}
                  selectedFormKey={selectedFormKey}
                  level={level}
                  origin={origin}
                  formOptions={formOptions}
                  cellSelections={cellSelections}
                  collection={collectionAnalysis}
                  onSpeciesChange={pokemonKey => {
                    setSelectedBaseKey(pokemonKey);
                    setSelectedFormKey('auto');
                  }}
                  onFormChange={setSelectedFormKey}
                  onLevelChange={setLevel}
                  onOriginChange={setOrigin}
                  onCellChange={(index, ribbonId) => {
                    setCellSelections(current => current.map(
                      (value, cellIndex) => cellIndex === index ? ribbonId : value,
                    ));
                  }}
                  onRetry={() => handleAnalyze(state.canvas)}
                />
              </div>
            )}

            {state.type === 'error' && (
              <div className="home-merger__error">
                <p className="home-merger__error-msg">Error: {state.message}</p>
                <button onClick={reset} className="home-merger__btn">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnalysisPanelProps {
  state: AnalysisState;
  selectedBaseKey: string;
  selectedFormKey: string;
  level: number;
  origin: HomeOrigin | '';
  formOptions: PokemonIdentityCandidate[];
  cellSelections: string[];
  collection: RibbonCollectionAnalysis | null;
  onSpeciesChange: (pokemonKey: string) => void;
  onFormChange: (pokemonKey: string) => void;
  onLevelChange: (level: number) => void;
  onOriginChange: (origin: HomeOrigin | '') => void;
  onCellChange: (index: number, ribbonId: string) => void;
  onRetry: () => void;
}

function AnalysisPanel({
  state,
  selectedBaseKey,
  selectedFormKey,
  level,
  origin,
  formOptions,
  cellSelections,
  collection,
  onSpeciesChange,
  onFormChange,
  onLevelChange,
  onOriginChange,
  onCellChange,
  onRetry,
}: AnalysisPanelProps) {
  if (state.type === 'idle') return null;

  if (state.type === 'processing') {
    return (
      <section className="home-analysis" aria-live="polite">
        <h2>Analyzing summary</h2>
        <progress
          className="home-merger__progress"
          value={state.progress}
          max={1}
        />
        <p className="home-merger__status">{state.detail}</p>
      </section>
    );
  }

  if (state.type === 'error') {
    return (
      <section className="home-analysis home-analysis--error">
        <h2>Ribbon analysis needs attention</h2>
        <p>{state.message}</p>
        <button className="home-merger__btn" onClick={onRetry}>
          Try analysis again
        </button>
      </section>
    );
  }

  const { result } = state;
  const bestSpecies = result.identity.candidates[0];

  return (
    <section className="home-analysis" aria-labelledby="home-analysis-title">
      <h2 id="home-analysis-title">Ribbon analysis</h2>
      <p className="home-analysis__privacy">
        Analysis runs in your browser. Version 1 expects an English Pokémon HOME summary.
      </p>

      <div className="home-analysis__identity">
        <label>
          <span>Pokémon</span>
          <select
            value={selectedBaseKey}
            onChange={event => onSpeciesChange(event.target.value)}
          >
            <option value="">Select Pokémon</option>
            {SPECIES_OPTIONS.map(option => (
              <option key={option.pokemonKey} value={option.pokemonKey}>
                No. {String(option.dexNumber).padStart(4, '0')} {option.name}
              </option>
            ))}
          </select>
        </label>

        <div className="home-analysis__paired-controls">
          <label>
            <span>Level</span>
            <input
              type="number"
              min="1"
              max="100"
              value={level}
              onChange={event => {
                const next = Number(event.target.value);
                if (next >= 1 && next <= 100) onLevelChange(next);
              }}
            />
          </label>
          <label>
            <span>Form</span>
            <select
              value={selectedFormKey}
              onChange={event => onFormChange(event.target.value)}
            >
              <option value="auto">
                Auto{bestSpecies ? ` (${bestSpecies.displayName})` : ''}
              </option>
              {formOptions.map(option => (
                <option key={option.pokemonKey} value={option.pokemonKey}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Origin</span>
          <select
            value={origin}
            onChange={event => onOriginChange(event.target.value as HomeOrigin | '')}
          >
            <option value="">Select origin</option>
            {HOME_ORIGINS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="home-analysis__detected-details">
          <span>
            Types: {result.identity.displayedTypes.join(' / ') || 'not read'}
          </span>
          <span>
            Shadow: {cellSelections.includes('national-ribbon') ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {(!selectedBaseKey || !origin) && (
        <p className="home-analysis__warning">
          Confirm the Pokémon and origin to calculate remaining ribbons.
        </p>
      )}

      <details className="home-analysis__corrections">
        <summary>Edit detected ribbons</summary>
        <div className="home-analysis__cell-grid">
          {result.ribbonMatches.map((match, index) => {
            const selected = cellSelections[index] ?? '';
            const candidateIds = [...new Set([
              match.best.ribbonId,
              ...match.alternatives.map(candidate => candidate.ribbonId),
            ])];

            return (
              <label key={`${match.cell.row}-${match.cell.column}`}>
                <span>Row {match.cell.row + 1}, column {match.cell.column + 1}</span>
                <div className="home-analysis__cell-control">
                  {selected && (
                    <img
                      src={`${import.meta.env.BASE_URL}images/ribbons/${selected}.png`}
                      alt=""
                    />
                  )}
                  <select
                    value={selected}
                    onChange={event => onCellChange(index, event.target.value)}
                  >
                    <option value="">Remove detection</option>
                    {candidateIds.map(ribbonId => (
                      <option key={ribbonId} value={ribbonId}>
                        {ribbonName(ribbonId)}
                      </option>
                    ))}
                    <optgroup label="All ribbons and marks">
                      {Object.keys(RIBBONS)
                        .filter(ribbonId => !candidateIds.includes(ribbonId))
                        .map(ribbonId => (
                          <option key={ribbonId} value={ribbonId}>
                            {ribbonName(ribbonId)}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </label>
            );
          })}
        </div>
      </details>

      {collection && (
        <div className="home-analysis__results">
          <RibbonResultSection
            title="Owned"
            ribbons={collection.owned.map(item => ({
              ribbonId: item.detectedRibbonId,
              gameGroups: item.gameGroups,
            }))}
            empty="No expected ribbons were confirmed."
          />
          <RibbonResultSection
            title="Remaining"
            ribbons={collection.stillObtainable}
            empty="No remaining ribbons can be earned after HOME."
          />
          <RibbonResultSection
            title="Missed"
            ribbons={collection.missed}
            empty="No permanently missed ribbons."
          />
          <RibbonResultSection
            title="Special extras"
            ribbons={collection.extras.map(ribbonId => ({
              ribbonId,
              gameGroups: [],
            }))}
            empty="No event ribbons, marks, or other extras detected."
          />
        </div>
      )}
    </section>
  );
}

function ribbonName(ribbonId: string): string {
  return RIBBONS[ribbonId]?.names?.en ?? ribbonId;
}

interface RibbonResultSectionProps {
  title: string;
  ribbons: EligibleRibbon[];
  empty: string;
}

function RibbonResultSection({ title, ribbons, empty }: RibbonResultSectionProps) {
  return (
    <section className="home-analysis__result-section">
      <h3>{title} <span>{ribbons.length}</span></h3>
      {ribbons.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <div className="home-analysis__ribbon-list">
          {ribbons.map(ribbon => (
            <article key={`${title}-${ribbon.ribbonId}`}>
              <img
                src={`${import.meta.env.BASE_URL}images/ribbons/${ribbon.ribbonId}.png`}
                alt=""
              />
              <div>
                <strong>{ribbonName(ribbon.ribbonId)}</strong>
                {ribbon.gameGroups.length > 0 && (
                  <span>{ribbon.gameGroups.join(', ')}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

interface ExampleImageProps {
  src: string;
  filename: string;
  alt: string;
  result?: boolean;
}

function ExampleImage({ src, filename, alt, result = false }: ExampleImageProps) {
  return (
    <figure className={`home-merger__example${result ? ' home-merger__example--result' : ''}`}>
      <a href={src} target="_blank" rel="noreferrer" className="home-merger__example-link">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="home-merger__example-image"
        />
      </a>
      <figcaption>{filename} <span>(select to view full size)</span></figcaption>
    </figure>
  );
}
