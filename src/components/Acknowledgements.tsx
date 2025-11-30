import React from 'react';
import './acknowledgements.css';

interface AcknowledgementLink {
  name: string;
  url: string;
}

interface AcknowledgementsProps {
  pageSpecific?: AcknowledgementLink[];
}

export default function Acknowledgements({ pageSpecific = [] }: AcknowledgementsProps) {
  const commonResources: AcknowledgementLink[] = [
    { name: 'PkmnShuffleMap', url: 'https://github.com/nileplumb/PkmnShuffleMap/' },
    { name: 'Bulbapedia', url: 'https://bulbapedia.bulbagarden.net/' },
    { name: 'PokéSprite', url: 'https://github.com/msikma/pokesprite' },
    { name: 'PokéAPI', url: 'https://pokeapi.co/' },
  ];

  return (
    <div className="acknowledgements">
      <h4>Acknowledgements</h4>
      {pageSpecific.length > 0 && (
        <p>
          It was developed to help Pokémon fans with love for the r/PokémonRibbons community. This page uses data provided by{' '}
          {pageSpecific.map((item, index) => (
            <React.Fragment key={item.name}>
              {index > 0 && ', '}
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.name}
              </a>
            </React.Fragment>
          ))}
          . Their contributions to the Pokémon Ribbons community are greatly appreciated.
        </p>
      )}
      <p>
        Additional data and sprite assets have been sourced from{' '}
        {commonResources.map((item, index) => (
          <React.Fragment key={item.name}>
            {index > 0 && ', '}
            {index === commonResources.length - 1 && 'and '}
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.name}
            </a>
          </React.Fragment>
        ))}
        . We are grateful for these excellent community resources.
      </p>
    </div>
  );
}
