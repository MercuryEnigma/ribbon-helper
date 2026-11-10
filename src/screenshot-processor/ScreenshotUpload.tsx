import type { Ref } from 'react';
import '../home-merger/home-merger.css';
import './screenshot-upload.css';

export default function ScreenshotUpload({ onFiles, busy = false, hasImage = false, inputRef }: {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  hasImage?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return <label className={`home-merger__dropzone screenshot-upload${busy ? ' screenshot-upload--busy' : ''}`}>
    <input ref={inputRef} className="home-merger__file-input" type="file" aria-label="Upload screenshots" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple disabled={busy}
      onChange={event => { if (event.target.files?.length) onFiles(Array.from(event.target.files)); event.target.value = ''; }} />
    <span className="home-merger__dropzone-icon" aria-hidden="true">📁</span>
    <span className="home-merger__dropzone-text">{hasImage ? 'Choose different screenshots' : 'Select your screenshots'}</span>
    <span className="home-merger__dropzone-hint">One or more PNG or JPEG images · Up to 12 MB each<br />Automatically detects HOME, Sword/Shield, BDSP, or Scarlet/Violet</span>
  </label>;
}
