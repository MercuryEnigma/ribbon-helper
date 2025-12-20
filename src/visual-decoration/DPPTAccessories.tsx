/// <reference types="vite/client" />
import { useState, useMemo } from 'react';
import { getAccessories, type Theme, type Acquisition } from './getAccessories';

type AcquisitionMethodOption = {
  label: string;
  values: Acquisition[];
};

const ACQUISITION_METHODS: AcquisitionMethodOption[] = [
  { label: 'Amity Square', values: ['amity-square'] },
  { label: 'Around Sinnoh', values: ['starter-mask', 'eterna-forest', 'route-206', 'unobtainable'] },
  { label: 'Contest Reward', values: ['contest-reward'] },
  { label: 'Massage Girl', values: ['massage-girl'] },
  { label: 'Flower Shop', values: ['flower-shop'] },
  { label: 'Pal Park', values: ['pal-park'] }
];

// Default enabled methods: all except Unobtainable
const DEFAULT_ENABLED = new Set([
  'Amity Square',
  // 'Massage Girl',
  // 'Flower Shop',
  'Contest Reward',
  'Around Sinnoh',
  // 'Pal Park'
]);

const THEMES: { label: string; value: Theme }[] = [
  { label: 'Bright', value: 'bright' },
  { label: 'Colorful', value: 'colorful' },
  { label: 'Created', value: 'created' },
  { label: 'Festive', value: 'festive' },
  { label: 'Flexible', value: 'flexible' },
  { label: 'Gaudy', value: 'gaudy' },
  { label: 'Intangible', value: 'intangible' },
  { label: 'Natural', value: 'natural' },
  { label: 'Relaxed', value: 'relaxed' },
  { label: 'Shapely', value: 'shapely' },
  { label: 'Sharp', value: 'sharp' },
  { label: 'Solid', value: 'solid' }
];

export default function DPPTAccessories() {
  const [theme, setTheme] = useState<Theme>('bright');
  const [enabledMethods, setEnabledMethods] = useState<Set<string>>(DEFAULT_ENABLED);
  const [hoveredAccessory, setHoveredAccessory] = useState<{
    id: string;
    name: string;
    acquisition: Record<string, string>;
    x: number;
    y: number;
  } | null>(null);

  const eligibleAcquisitions = useMemo(() => {
    const acquisitions = new Set<Acquisition>();
    enabledMethods.forEach((methodLabel) => {
      const method = ACQUISITION_METHODS.find(m => m.label === methodLabel);
      if (method) {
        method.values.forEach((val) => acquisitions.add(val));
      }
    });
    return acquisitions;
  }, [enabledMethods]);

  const accessories = useMemo(() => {
    return getAccessories(theme, eligibleAcquisitions);
  }, [theme, eligibleAcquisitions]);

  const accessoryGroups = useMemo(() => {
    const groups: Array<{
      score: number;
      pageGroups: Array<{
        page: string;
        accessories: Array<{ id: string; name: string; acquisition: Record<string, string> }>
      }>
    }> = [];

    // Only show scores 2 and 1
    for (const score of [2, 1]) {
      const pages = accessories[score as 2 | 1];
      if (!pages) continue;

      const pageGroups = Object.entries(pages).map(([page, pageGroup]) => ({
        page,
        accessories: Object.entries(pageGroup).map(([id, info]) => ({
          id,
          name: info.name,
          acquisition: info.acquisition
        }))
      }));

      if (pageGroups.length > 0) {
        groups.push({ score, pageGroups });
      }
    }

    return groups;
  }, [accessories]);

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
    <div className="dppt-accessories">
      <div className="accessories-controls">
        <div className="theme-selector">
          <label className="control-label">Contest Theme:</label>
          <div className="theme-buttons">
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={theme === t.value ? 'active' : ''}
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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

      <div className="accessories-display">
        {accessoryGroups.length > 0 ? (
          accessoryGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="accessory-score-section">
              <div className="accessory-score-label">{group.score}</div>
              <div className="accessory-page-groups">
                {group.pageGroups.map((pageGroup, pageIndex) => {
                  const isUnobtainableGroup = pageGroup.accessories.length === 1 && pageGroup.accessories[0].id === 'comet';
                  return (
                    <div
                      key={pageIndex}
                      className={`accessory-page-group${isUnobtainableGroup ? ' unobtainable' : ''}`}
                    >
                    <div className="accessory-items">
                      {pageGroup.accessories.map((accessory) => (
                        <div
                          key={accessory.id}
                          className={`accessory-item${
                            accessory.acquisition.unobtainable ? ' unobtainable' : ''
                          }`}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredAccessory({
                              id: accessory.id,
                              name: accessory.name,
                              acquisition: accessory.acquisition,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredAccessory(null)}
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}images/accessories/${accessory.id}.png`}
                            alt={accessory.name}
                            className="accessory-image"
                            onError={(e) => {
                              console.error(`Failed to load image: ${accessory.id}`);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="no-accessories">
            No accessories available with the selected acquisition methods.
          </div>
        )}
      </div>

      {hoveredAccessory && (
        <div
          className="accessory-tooltip"
          style={{
            left: `${hoveredAccessory.x}px`,
            top: `${hoveredAccessory.y}px`
          }}
        >
          <div
            className={`accessory-tooltip-header${hoveredAccessory.id === 'comet' ? ' unobtainable' : ''}`}
          >
            {hoveredAccessory.id === 'comet' ? hoveredAccessory.name + ' (Unobtainable)' : hoveredAccessory.name }
          </div>
          <div className="accessory-tooltip-body">
            <ul>
              {Object.values(hoveredAccessory.acquisition).map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
