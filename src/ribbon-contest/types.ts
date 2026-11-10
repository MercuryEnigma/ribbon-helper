export interface ContestDefinition {
  number: number;
  id: string;
  title: string;
  puzzle: string;
  opensAt: string;
  closesAt: string;
  verdictAt: string | null;
  hints: { number: number; text: string; releasesAt: string }[];
  answer: { pokemon: string; ribbonIds: string[] };
}

export interface ContestRound extends ContestDefinition {
  state: 'upcoming' | 'open' | 'closed';
  solution?: ContestDefinition['answer'];
}

export interface ContestAnswer {
  pokemon: string;
  ribbonIds: string[];
}

export interface ContestEntry extends ContestAnswer {
  reference: string;
  roundId: string;
}

export interface ContestFormConfig {
  url: string;
  fields: { roundId: string; pokemon: string; ribbonIds: string; reference?: string };
}
