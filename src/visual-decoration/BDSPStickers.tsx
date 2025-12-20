/// <reference types="vite/client" />
import { useState, useMemo } from 'react';
import { getStickers, type ContestType, type StickerAcquisition } from './getStickers';

type AcquisitionMethodOption = {
  label: string;
  values: StickerAcquisition[];
};

const ACQUISITION_METHODS: AcquisitionMethodOption[] = [
  { label: 'Champion', values: ['champion-final'] },
  { label: 'Contest Show master', values: ['contest-showmaster'] },
  { label: 'Fashionista', values: ['style-shop'] },
  {
    label: 'Around Sinnoh',
    values: ['canalave-city', 'route-206', 'route-209', 'route-213', 'snowpoint-city', 'starter-locale', 'super-contest-hall']
  },
  { label: 'Gym badge', values: ['gym-initial'] },
  { label: 'Contest reward', values: ['contest-reward'] },
  { label: 'Sunyshore market', values: ['sunyshore-market'] },
  { label: 'Flower shop', values: ['flower-shop'] },
  // Default unselected
  { label: 'Gym rematch', values: ['gym-rematch'] },
  { label: 'Amity square', values: ['amity-square'] },
  { label: 'Massage Girl', values: ['massage-girl'] },
  { label: 'Jubilife TV', values: ['jubilife-tv'] }
];

// Default enabled methods: all except Jubilife TV, Amity square, Gym rematch, Massage Girl
const DEFAULT_ENABLED = new Set([
  'Champion',
  'Contest Show master',
  'Fashionista',
  'Around Sinnoh',
  'Sunyshore market',
  'Flower shop',
  'Contest reward',
  'Gym badge'
]);

const CONTEST_TYPES: { label: string; value: ContestType }[] = [
  { label: 'Cool', value: 'cool' },
  { label: 'Beautiful', value: 'beautiful' },
  { label: 'Cute', value: 'cute' },
  { label: 'Clever', value: 'clever' },
  { label: 'Tough', value: 'tough' },
  { label: 'Brilliant / Shining', value: 'sheen' }
];

export default function BDSPStickers() {
  const [contestType, setContestType] = useState<ContestType>('cool');
  const [enabledMethods, setEnabledMethods] = useState<Set<string>>(DEFAULT_ENABLED);
  const [hoveredSticker, setHoveredSticker] = useState<{
    id: string;
    name: string;
    acquisition: Record<string, string>;
    x: number;
    y: number;
  } | null>(null);

  const eligibleAcquisitions = useMemo(() => {
    const acquisitions = new Set<StickerAcquisition>();
    enabledMethods.forEach((methodLabel) => {
      const method = ACQUISITION_METHODS.find(m => m.label === methodLabel);
      if (method) {
        method.values.forEach((val) => acquisitions.add(val));
      }
    });
    return acquisitions;
  }, [enabledMethods]);

  const stickers = useMemo(() => {
    return getStickers(contestType, eligibleAcquisitions);
  }, [contestType, eligibleAcquisitions]);

  const stickerGroups = useMemo(() => {
    const groups: Array<{
      score: number;
      pageGroups: Array<{
        page: string;
        stickers: Array<{ id: string; name: string; acquisition: Record<string, string> }>;
      }>;
    }> = [];

    const sortedPoints = Object.keys(stickers)
      .map(Number)
      .sort((a, b) => b - a);

    for (const points of sortedPoints) {
      if (points < 20) continue;

      const pages = stickers[points];
      const pageGroups = Object.entries(pages).map(([page, pageGroup]) => ({
        page,
        stickers: Object.entries(pageGroup).map(([id, info]) => ({
          id,
          name: info.name,
          acquisition: info.acquisition
        }))
      }));

      if (pageGroups.length > 0) {
        groups.push({ score: points, pageGroups });
      }
    }

    return groups;
  }, [stickers]);

  const toggleMethod = (label: string) => {
    const newEnabled = new Set(enabledMethods);
    if (newEnabled.has(label)) {
      newEnabled.delete(label);
    } else {
      newEnabled.add(label);
    }
    setEnabledMethods(newEnabled);
  };

  return (
    <div className="bdsp-stickers">
      <div className="stickers-controls">
        <div className="contest-type-selector">
          <label className="control-label">Contest Type:</label>
          <div className="contest-type-buttons">
            {CONTEST_TYPES.map((type) => (
              <button
                key={type.value}
                className={contestType === type.value ? 'active' : ''}
                onClick={() => setContestType(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
          <select
            className="contest-type-select"
            value={contestType}
            onChange={(e) => setContestType(e.target.value as ContestType)}
          >
            {CONTEST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="acquisition-methods">
          <label className="control-label">Acquisition Methods:</label>
          <div className="method-checkboxes">
            {ACQUISITION_METHODS.map((method) => (
              <label key={method.label} className="method-checkbox">
                <input
                  type="checkbox"
                  checked={enabledMethods.has(method.label)}
                  onChange={() => toggleMethod(method.label)}
                />
                <span className="checkbox-label">{method.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="stickers-display">
        {stickerGroups.length > 0 ? (
          stickerGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="sticker-score-section">
              <div className="sticker-score-label">{group.score}</div>
              <div className="sticker-page-groups">
                {group.pageGroups.map((pageGroup, pageIndex) => (
                  <div key={pageIndex} className="sticker-page-group">
                    <div className="sticker-items">
                      {pageGroup.stickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          className="sticker-item"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredSticker({
                              id: sticker.id,
                              name: sticker.name,
                              acquisition: sticker.acquisition,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredSticker(null)}
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}images/stickers/${sticker.id}.png`}
                            alt={sticker.name}
                            className="sticker-image"
                            onError={(e) => {
                              console.error(`Failed to load image: ${sticker.id}`);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-stickers">
            No stickers available with the selected acquisition methods.
          </div>
        )}
      </div>

      {hoveredSticker && (
        <div
          className="sticker-tooltip"
          style={{
            left: `${hoveredSticker.x}px`,
            top: `${hoveredSticker.y}px`
          }}
        >
          <div className="sticker-tooltip-header">{hoveredSticker.name}</div>
          <div className="sticker-tooltip-body">
            <ul>
              {Object.values(hoveredSticker.acquisition).map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
