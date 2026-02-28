import type { SetdexEntry } from './gen3calc'

export const TEAM_EM: Record<string, Record<string, SetdexEntry>> = {
  "Latios": {
    "Latios": {
      "evs": {
        "hp": 4,
        "sa": 252,
        "sp": 252
      },
      "moves": [
        "Psychic",
        "Ice Beam",
        "Thunderbolt",
        "Calm Mind"
      ],
      "nature": "Timid",
      "item": "Lum Berry"
    }
  },
  "Metagross": {
    "Metagross": {
      "evs": {
        "hp": 252,
        "at": 236,
        "df": 12,
        "sp": 8
      },
      "moves": [
        "Meteor Mash",
        "Earthquake",
        "Explosion",
        "Shadow Ball"
      ],
      "nature": "Adamant",
      "item": "Choice Band"
    }
  },
  "Suicune": {
    "Suicune": {
      "evs": {
        "hp": 252,
        "df": 252,
        "sd": 6
      },
      "moves": [
        "Surf",
        "Ice Beam",
        "Calm Mind",
        "Rest"
      ],
      "nature": "Bold",
      "item": "Leftovers"
    }
  }
}
