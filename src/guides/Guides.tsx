import { useNavigate, useParams } from 'react-router-dom'
import gamesData from '../data/games.json'
import ribbonsData from '../data/ribbons.json'
import { getGuideById, GUIDES } from './guideRegistry'
import './guides.css'

interface RibbonEntry {
  names: { en: string }
  descs: { en: string }
  available: string[]
}

interface GameEntry {
  names: { en: string }
}

const RIBBONS = ribbonsData as Record<string, RibbonEntry>
const GAMES = gamesData as Record<string, GameEntry>

function gameIdsToNames(ids: string[]): string {
  return ids.map(id => GAMES[id]?.names.en ?? id).join(', ')
}

export default function Guides() {
  const { guideId } = useParams<{ guideId: string }>()
  const navigate = useNavigate()
  const guide = getGuideById(guideId)

  return (
    <div className="guides-wrapper">
      <div className="trainer-card">
        <div className="trainer-card-header">
          <span className="trainer-card-pokeball" aria-hidden="true" />
          <select
            className="trainer-card-selector"
            value={guide.id}
            onChange={event => navigate(`/guides/${event.target.value}`)}
            aria-label="Select ribbon guide"
          >
            {GUIDES.map(guideOption => (
              <option key={guideOption.id} value={guideOption.id}>{guideOption.title}</option>
            ))}
          </select>
          <span className="trainer-card-pokeball" aria-hidden="true" />
        </div>

        <div className="trainer-card-body">
          <div className="trainer-card-info">
            <div className="guide-description">{guide.description}</div>
            <div className="trainer-card-divider" />
            {guide.ribbonGuideEntries.map(({ ribbonId, content }, index) => {
              const ribbon = RIBBONS[ribbonId]

              return (
                <div key={ribbonId} className="guide-entry">
                  {index > 0 && <div className="trainer-card-divider guide-entry-divider" />}
                  <div className="guide-entry-header">
                    <img
                      src={`${import.meta.env.BASE_URL}images/ribbons/${ribbonId}.png`}
                      alt={ribbon?.names.en ?? ribbonId}
                      className="guide-entry-img"
                    />
                    <div className="guide-entry-rows">
                      <div className="trainer-card-row">
                        <span className="tc-row-label">Ribbon Name</span>
                        <span className="tc-row-value">{ribbon?.names.en ?? ribbonId}</span>
                      </div>
                      {ribbon?.descs?.en && (
                        <div className="trainer-card-row">
                          <span className="tc-row-label">Description</span>
                          <span className="tc-row-value wrap">{ribbon.descs.en}</span>
                        </div>
                      )}
                      <div className="trainer-card-row">
                        <span className="tc-row-label">Available In</span>
                        <span className="tc-row-value">{ribbon ? gameIdsToNames(ribbon.available) : '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="trainer-card-guide">
                    {content}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
