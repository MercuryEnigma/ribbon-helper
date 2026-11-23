import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RibbonContest from './RibbonContest';
import type { ContestDefinition } from './types';

vi.mock('./recognition', () => ({
  recognizeContestFiles: vi.fn(async () => ({
    game: 'home', imageUrl: 'blob:test-screenshot', pokemon: '', ribbonIds: [], warning: '', candidates: [],
  })),
}));

describe('RibbonContest requirements', () => {
  it('unlocks uploads and the prefilled form for any Pokémon with no excluded ribbon', async () => {
    const round: ContestDefinition = {
      number: 1, id: 'any', title: 'Any species puzzle', puzzle: 'Avoid Effort.',
      opensAt: new Date(Date.now() - 3600000).toISOString(),
      closesAt: new Date(Date.now() + 3600000).toISOString(), verdictAt: null, hints: [],
      answer: { pokemon: 'any-pokemon', ribbonIds: ['effort-ribbon'], ribbonRequirements: [[{ ribbonId: 'effort-ribbon', excluded: true }]] },
    };
    render(<MemoryRouter><RibbonContest loadRounds={async () => [round]} /></MemoryRouter>);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Pokémon' }), { target: { value: 'milotic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    const upload = await screen.findByLabelText('Upload screenshots');
    expect(screen.getByText(/Correct! Your answer/)).toBeInTheDocument();
    fireEvent.change(upload, { target: { files: [new File(['test'], 'test.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByTitle('Scavenger hunt submission form')).toBeInTheDocument());
    expect(screen.getByTitle('Scavenger hunt submission form').getAttribute('src')).toContain('milotic');

    fireEvent.click(screen.getByRole('checkbox', { name: /Effort Ribbon/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.queryByLabelText('Upload screenshots')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Scavenger hunt submission form')).not.toBeInTheDocument();
  });
});
