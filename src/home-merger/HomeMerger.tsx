import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDES } from '../guides/guideRegistry';
import { mergeAll } from './ocrMerge';
import { loadFileToCanvas, canvasToBlob } from './imageUtils';
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
  | { type: 'done'; url: string; filename: string }
  | { type: 'error'; message: string };

export default function HomeMerger() {
  const navigate = useNavigate();
  const [state, setState] = useState<MergerState>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length < 2) return;
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    setState({ type: 'ready', files: sorted });
  }, []);

  const handleMerge = useCallback(async (files: File[]) => {
    setState({ type: 'processing', step: 0, total: files.length - 1, detail: 'Loading images…' });

    try {
      const canvases = await Promise.all(files.map(loadFileToCanvas));

      const merged = await mergeAll(canvases, (step, total, detail) => {
        setState({ type: 'processing', step, total, detail });
      });

      const blob = await canvasToBlob(merged);
      const url = URL.createObjectURL(blob);
      setState({ type: 'done', url, filename: 'merged-home.PNG' });
    } catch (err) {
      setState({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ type: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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
            <option value="stitching">Stitch Summary</option>
          </select>
          <span className="trainer-card-pokeball" aria-hidden="true" />
        </div>
        <div className="trainer-card-body">
          <div className="trainer-card-info">
            <p className="guide-description">
              Take several overlapping screenshots of a Pokémon's summary in the
              Pokémon HOME mobile app, then upload them together to create one unified image.
            </p>
            <div className="trainer-card-divider" />

            <section className="home-merger__instructions" aria-labelledby="stitching-instructions">
              <h2 id="stitching-instructions" className="home-merger__instructions-title">
                How to stitch a summary
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
                      <h3>Merge and download the unified image</h3>
                      <p>
                        Select Merge, review the preview, and download the finished image.
                        The overlapping areas are included only once.
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
