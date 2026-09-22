const STORAGE_KEY = 'voidfrontier.progression.v1';

export interface ProgressionState {
  xp: number;
  level: number;
  credits: number;
  lifetimeKills: number;
  lifetimeDeaths: number;
  lifetimeResourcesMined: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

const DEFAULT_STATE: ProgressionState = {
  xp: 0,
  level: 1,
  credits: 0,
  lifetimeKills: 0,
  lifetimeDeaths: 0,
  lifetimeResourcesMined: 0,
  matchesPlayed: 0,
  wins: 0,
  losses: 0
};

/** XP required to go from `level` to `level + 1`. Simple, tunable curve. */
function xpForNextLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

export interface MatchResultInput {
  kills: number;
  deaths: number;
  resourcesMined: number;
  won: boolean | null; // null for modes with no win/loss condition (e.g. free-roam Practice)
}

export interface MatchAward {
  xpGained: number;
  creditsGained: number;
  leveledUpTo: number | null;
}

/**
 * Local-storage-backed progression. This is real persistence (survives
 * reloads on this device), not a mock — but it is NOT a server account:
 * it will not follow the player to another browser/device until a real
 * backend exists (see server/README notes). That limitation is surfaced
 * in the UI rather than hidden.
 */
export class Progression {
  private state: ProgressionState;

  constructor() {
    this.state = this.load();
  }

  private load(): ProgressionState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* localStorage unavailable (private browsing, quota) — progression just won't persist */
    }
  }

  get snapshot(): Readonly<ProgressionState> {
    return this.state;
  }

  xpToNext(): number {
    return xpForNextLevel(this.state.level);
  }

  /** Applies a completed match's results, returns what was gained (for the Results screen). */
  applyMatchResult(input: MatchResultInput): MatchAward {
    const xpGained = Math.round(input.kills * 25 + input.resourcesMined * 0.5 + (input.won ? 40 : 0));
    const creditsGained = Math.round(input.kills * 10 + input.resourcesMined * 0.8 + (input.won ? 25 : 0));

    this.state.xp += xpGained;
    this.state.credits += creditsGained;
    this.state.lifetimeKills += input.kills;
    this.state.lifetimeDeaths += input.deaths;
    this.state.lifetimeResourcesMined += input.resourcesMined;
    this.state.matchesPlayed += 1;
    if (input.won === true) this.state.wins += 1;
    if (input.won === false) this.state.losses += 1;

    let leveledUpTo: number | null = null;
    while (this.state.xp >= xpForNextLevel(this.state.level)) {
      this.state.xp -= xpForNextLevel(this.state.level);
      this.state.level += 1;
      leveledUpTo = this.state.level;
    }

    this.save();
    return { xpGained, creditsGained, leveledUpTo };
  }
}
