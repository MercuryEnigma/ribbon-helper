import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_GUIDE_ID, GUIDES } from './guideRegistry'

interface CommunityHeaderProps {
  section: 'guides' | 'ribbon-checker' | 'puzzles'
  guideId?: string
}

export default function CommunityHeader({ section, guideId }: CommunityHeaderProps) {
  const navigate = useNavigate()
  const options = section === 'guides'
    ? GUIDES.map(guide => ({ id: guide.id, title: guide.title }))
    : section === 'ribbon-checker'
      ? [{ id: 'ribbon-checker', title: 'Ribbon Checker' }]
      : [{ id: 'ribbon-puzzles', title: 'Scavenger Hunt' }]
  const selectorLabel = section === 'guides'
    ? 'Select ribbon guide'
    : section === 'ribbon-checker' ? 'Select Ribbon Masters tool' : 'Select scavenger hunt'

  return (
    <div className="trainer-card-header community-header">
      <nav className="community-tabs" aria-label="Community">
        {[
          { id: 'guides', label: 'Guides', path: DEFAULT_GUIDE_ID },
          { id: 'ribbon-checker', label: 'Ribbon Masters', path: 'ribbon-checker' },
          { id: 'puzzles', label: 'Scavenger Hunts', path: 'ribbon-puzzles' },
        ].map(tab => (
          <Link
            key={tab.id}
            to={`/guides/${tab.path}`}
            className={`community-tab${section === tab.id ? ' active' : ''}`}
            aria-current={section === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <select
        className="trainer-card-selector"
        value={section === 'guides' ? guideId ?? DEFAULT_GUIDE_ID : options[0].id}
        onChange={event => navigate(`/guides/${event.target.value}`)}
        aria-label={selectorLabel}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>{option.title}</option>
        ))}
      </select>
    </div>
  )
}
