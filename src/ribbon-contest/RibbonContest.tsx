import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDES } from '../guides/guideRegistry';
import { POKEMON_OPTIONS, RIBBON_OPTIONS, pokemonName, ribbonName } from './catalog';
import { CONTEST_FORM, CONTEST_SHEET_URL } from './config';
import { checkAnswer, roundAt } from './contestData';
import { formUrls, loadContestSheet } from './service';
import { recognizeContestFiles, type ContestRecognition } from './recognition';
import type { ContestDefinition, ContestFormConfig } from './types';
import ScreenshotUpload from '../screenshot-processor/ScreenshotUpload';
import { SCREENSHOT_GAME_NAMES } from '../screenshot-processor/gameLayouts';
import '../guides/guides.css';
import '../home-merger/home-merger.css';
import './ribbon-contest.css';

const defaultLoader = (signal?: AbortSignal) => loadContestSheet(CONTEST_SHEET_URL, signal);
function date(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }

function StepHeading({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className="home-merger__step-copy">
    <span className="home-merger__step-number" aria-hidden="true">{number}</span>
    <div><h3>{title}</h3>{children}</div>
  </div>;
}

interface Props {
  loadRounds?: (signal?: AbortSignal) => Promise<ContestDefinition[]>;
  formConfig?: ContestFormConfig;
}

export default function RibbonContest({ loadRounds = defaultLoader, formConfig = CONTEST_FORM }: Props) {
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<ContestDefinition[]>([]);
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [progress, setProgress] = useState('');
  const [image, setImage] = useState<ContestRecognition | null>(null);
  const [pokemon, setPokemon] = useState('');
  const [ribbonIds, setRibbonIds] = useState<string[]>([]);
  const [ribbonSearch, setRibbonSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [includeImage, setIncludeImage] = useState(true);
  const run = useRef(0);
  const activeImageUrl = useRef<string | null>(null);
  const rounds = definitions.map(definition => roundAt(definition, now));
  const round = rounds.find(item => item.id === selectedId);
  const reviewed = !!image && confirmed && !!pokemon && ribbonIds.length > 0;
  const correct = !!round && reviewed && checkAnswer(round, { pokemon, ribbonIds });
  const canSubmit = correct && round?.state === 'open';
  const preparedForm = useMemo(() => {
    if (!canSubmit) return { urls: null, error: '' };
    try {
      return { urls: formUrls(formConfig, { reference: crypto.randomUUID(), roundId: selectedId, pokemon, ribbonIds }), error: '' };
    } catch (failure) { return { urls: null, error: message(failure) }; }
  }, [canSubmit, selectedId, pokemon, ribbonIds, formConfig]);
  const form = preparedForm.urls;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false, fetching = false;
    let controller: AbortController | null = null;
    setLoading(true); setLoadError('');
    async function refresh() {
      if (fetching) return;
      fetching = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20000);
      try {
        const result = await loadRounds(controller.signal);
        if (disposed) return;
        setDefinitions(result); setNow(Date.now()); setLoadError('');
        setSelectedId(previous => result.some(item => item.id === previous) ? previous
          : (result.find(item => roundAt(item, Date.now()).state === 'open') ?? result.find(item => roundAt(item, Date.now()).state === 'upcoming') ?? result[result.length - 1])?.id ?? '');
      } catch (failure) {
        if (!disposed) {
          console.error('Could not load contest information:', failure);
          setLoadError('Contest information could not be loaded. Please try again later.');
        }
      } finally { clearTimeout(timeout); fetching = false; if (!disposed) setLoading(false); }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    return () => { disposed = true; clearInterval(timer); controller?.abort(); };
  }, [loadRounds, reload]);

  useEffect(() => () => { run.current++; if (activeImageUrl.current) URL.revokeObjectURL(activeImageUrl.current); }, []);

  function clearUpload() {
    run.current++;
    if (activeImageUrl.current) URL.revokeObjectURL(activeImageUrl.current);
    activeImageUrl.current = null;
    setImage(null); setPokemon(''); setRibbonIds([]); setConfirmed(false); setIncludeImage(true); setProgress(''); setError('');
  }

  async function upload(files: File[]) {
    clearUpload();
    const id = run.current;
    setProgress('Reading screenshots');
    try {
      const result = await recognizeContestFiles(files, detail => { if (id === run.current) setProgress(detail); });
      if (id !== run.current) { URL.revokeObjectURL(result.imageUrl); return; }
      activeImageUrl.current = result.imageUrl;
      setImage(result); setPokemon(result.pokemon); setRibbonIds(result.ribbonIds);
    } catch (failure) { if (id === run.current) setError(message(failure)); }
    finally { if (id === run.current) setProgress(''); }
  }

  return <div className="guides-wrapper ribbon-contest"><div className="trainer-card">
    <div className="trainer-card-header">
      <span className="trainer-card-pokeball" aria-hidden="true" />
      <select className="trainer-card-selector" value="ribbon-contest" aria-label="Select ribbon guide" onChange={event => navigate(`/guides/${event.target.value}`)}>
        {GUIDES.map(guide => <option key={guide.id} value={guide.id}>{guide.title}</option>)}
        <option value="ribbon-checker">Ribbon Checker</option><option value="ribbon-contest" hidden disabled>Ribbon Puzzles</option>
      </select>
      <span className="trainer-card-pokeball" aria-hidden="true" />
    </div>
    <div className="trainer-card-body"><div className="trainer-card-info">
      <p className="guide-description">Periodically, the Pokemon Ribbons community holds puzzle contests. Solve the puzzle and submit the right Pokemon with the appropriate ribbon(s).</p>
      <div className="trainer-card-divider" />

      {loading && <div className="home-merger__processing" role="status"><p className="home-merger__status">Loading contests…</p></div>}
      {loadError && <div className="home-merger__error" role="alert"><p className="home-merger__error-msg">{loadError}</p><div className="home-merger__actions"><button className="home-merger__btn" type="button" onClick={() => setReload(value => value + 1)}>Reload contests</button></div></div>}
      {!loading && !rounds.length && !loadError && <p className="home-merger__status">No contests are available yet. Check back soon.</p>}

      {!!rounds.length && <div className="home-analysis rc-round-picker"><label className="rc-field"><span>Puzzle</span><select value={selectedId} disabled={!!progress} onChange={event => { clearUpload(); setSelectedId(event.target.value); }}>
        {rounds.map(item => <option key={item.id} value={item.id}>#{item.number} {item.title} — {item.state}</option>)}
      </select></label></div>}

      {round && <>
          <section className="home-merger__step rc-puzzle" aria-labelledby="rc-puzzle-title">
            <div>
              <h2 id="rc-puzzle-title">{round.title}</h2>
              <p className="rc-text">{round.state === 'upcoming' ? 'The puzzle will appear once the contest starts.' : round.puzzle}</p>
              <p><span className="rc-round-state">{round.state === 'open' ? 'Accepting entries' : round.state === 'closed' ? 'Round closed' : 'Upcoming round'}</span></p>
            </div>
            <dl className="rc-timeline">
              <div><dt>Starts</dt><dd><time dateTime={round.opensAt}>{date(round.opensAt)}</time></dd></div>
              <div><dt>Ends</dt><dd><time dateTime={round.closesAt}>{date(round.closesAt)}</time></dd></div>
            </dl>
            {!!round.hints.length && <div className="home-merger__step-widget rc-hints">{round.hints.map(hint => <div className="home-analysis__result-section" key={hint.number}><h3>Hint {hint.number}</h3><p className="rc-text">{hint.text}</p></div>)}</div>}
            {round.solution && <div className="home-merger__step-widget home-analysis rc-solution"><h3>Answer: {pokemonName(round.solution.pokemon)}</h3><div className="home-analysis__ribbon-list">{round.solution.ribbonIds.map(id => <article key={id}><img src={`${import.meta.env.BASE_URL}images/ribbons/${id}.png`} alt="" /><strong>{ribbonName(id)}</strong></article>)}</div></div>}
          </section>
          {round.state === 'open' && <section className="home-merger__instructions" aria-labelledby="rc-instructions">
            <h2 className="home-merger__instructions-title" id="rc-instructions">How to enter the Ribbon Contest</h2>
            <ol className="home-merger__steps">
            <li className="home-merger__step rc-step-full">
              <StepHeading number={1} title="Upload your screenshots">
                <p>Select one or more screenshots of your Pokémon. HOME, Sword/Shield, BDSP, and Scarlet/Violet verified tested.</p>
              </StepHeading>
              <div className="home-merger__step-widget">
                <ScreenshotUpload onFiles={files => void upload(files)} busy={!!progress} hasImage={!!image} />
                <p className="home-analysis__privacy">Screenshots stay on your device unless you choose to attach one in Google Forms.</p>
                {progress && <div className="home-merger__processing" role="status"><progress className="home-merger__progress" aria-label="Reading screenshots" /><p className="home-merger__status">{progress}…</p></div>}
                {error && <p role="alert" className="home-merger__error-msg">{error}</p>}
              </div>
            </li>

            <li className={`home-merger__step${image ? '' : ' rc-step-full'}`}>
              <StepHeading number={2} title="Review and check your answer"><p>Check the detected species and every ribbon against your screenshot. Correct anything that was misread, then confirm your selections to check the answer.</p></StepHeading>
              {image && <figure className="home-merger__example"><a className="home-merger__example-link" href={image.imageUrl} target="_blank" rel="noreferrer"><img className="home-merger__example-image" src={image.imageUrl} alt="Your uploaded ribbon screenshot" /></a><figcaption>Open your screenshot ↗</figcaption></figure>}
              {image && <div className="home-merger__step-widget home-analysis">
                <p className="home-analysis__privacy">{SCREENSHOT_GAME_NAMES[image.game]} detected. Review the consolidated image and ribbon selections.</p>
                {image.warning && <p className="home-analysis__warning rc-recognition-note">{image.warning}</p>}
                <label className="rc-field"><span>Pokémon</span><select aria-label="Pokémon" value={pokemon} onChange={event => { setPokemon(event.target.value); setConfirmed(false); }}><option value="">Choose the species and form</option>{POKEMON_OPTIONS.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
                <div className="home-analysis__result-section rc-selected-ribbons"><h3>Selected ribbons <span>{ribbonIds.length}</span></h3>
                  {ribbonIds.length ? <div className="home-analysis__ribbon-list">{ribbonIds.map(id => <article key={id}><img src={`${import.meta.env.BASE_URL}images/ribbons/${id}.png`} alt="" /><strong>{ribbonName(id)}</strong></article>)}</div> : <p>No ribbons selected. Open the corrections below to add the ribbons visible in your screenshot.</p>}
                </div>
                <details className="home-analysis__corrections"><summary>Add or correct ribbons</summary>
                  <label className="rc-field"><span>Find a ribbon</span><input type="search" value={ribbonSearch} onChange={event => setRibbonSearch(event.target.value)} /></label>
                  <fieldset className="rc-ribbons"><legend>Visible ribbons and marks</legend>{RIBBON_OPTIONS.filter(item => !ribbonSearch || `${item.name} ${item.key}`.toLowerCase().includes(ribbonSearch.toLowerCase())).map(item => <label key={item.key}><input type="checkbox" checked={ribbonIds.includes(item.key)} onChange={event => { setRibbonIds(previous => event.target.checked ? [...previous, item.key] : previous.filter(id => id !== item.key)); setConfirmed(false); }} /><img loading="lazy" src={`${import.meta.env.BASE_URL}images/ribbons/${item.key}.png`} alt="" /><span>{item.name}<small>{item.key}</small></span></label>)}</fieldset>
                </details>
                {!!image.candidates.length && <details className="home-analysis__corrections"><summary>Uncertain suggestions ({image.candidates.length})</summary><p className="rc-supporting-text">These were not selected automatically. Check them against the image.</p><ul className="rc-suggestions">{[...new Map(image.candidates.map(candidate => [candidate.key, candidate])).values()].map(candidate => <li key={candidate.key}>{ribbonName(candidate.key)} ({Math.round(candidate.confidence * 100)}% similarity)</li>)}</ul></details>}
                <label className="rc-confirm"><input type="checkbox" checked={includeImage} onChange={event => setIncludeImage(event.target.checked)} aria-describedby="rc-image-help" /><span>Include any image of your Pokémon with your entry. We will display them with the rest of the community submissions!</span></label>
                <p className="rc-supporting-text" id="rc-image-help">{includeImage ? 'Download the combined image, then attach it to “Image of your pokemon” in the form.' : 'Attach any image to “Image of your pokemon”, or leave it blank.'}</p>
                {includeImage && <div className="home-merger__actions"><a className="home-merger__btn" href={image.imageUrl} download={`ribbon-contest-${pokemon || 'pokemon'}-${image.game}.png`}>Download combined image</a></div>}
                <label className="rc-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I have verified the Pokémon information is accurate.</span></label>
                {reviewed && <p className={correct ? 'rc-verdict rc-verdict--correct' : 'home-analysis__warning'} role="status">{correct ? 'Correct! Your Pokémon solved the puzzle! Submit your entry below.' : 'Not quite. That Pokémon does not solve the puzzle. Check the puzzle and try again.'}</p>}
                {confirmed && !pokemon && <p className="home-analysis__warning" role="status">Select the Pokémon species.</p>}
                {confirmed && pokemon && !ribbonIds.length && <p className="home-analysis__warning" role="status">Select the ribbons this Pokémon has received.</p>}
                {preparedForm.error && <p className="home-merger__error-msg" role="alert">{preparedForm.error}</p>}
              </div>}
            </li>

          <li className="home-merger__step rc-step-full">
            <StepHeading number={3} title="Submit your entry"><p>{form ? 'Enter your Discord handle and click Submit in the form. Google Forms will confirm when your entry is received.' : 'The submission form will appear here once your reviewed answer is correct.'}</p></StepHeading>
            {form && <div className="home-merger__step-widget">
              {includeImage && <p className="rc-supporting-text">Attach your downloaded image to “Image of your pokemon” in the form.</p>}
              <div className="home-merger__actions"><a className="home-merger__btn" href={form.external} target="_blank" rel="noreferrer">Open form in a new tab ↗</a><button className="home-merger__btn" type="button" onClick={clearUpload}>Start another attempt</button></div>
              <iframe className="rc-form" title="Ribbon Contest submission form" src={form.embedded} />
            </div>}
          </li>
        </ol>
        </section>}
        {round.state !== 'open' && <p className="home-analysis__privacy">{round.state === 'closed' ? 'This puzzle has concluded.' : 'Come back soon when the puzzle starts.'}</p>}
      </>}
    </div></div>
  </div></div>;
}
