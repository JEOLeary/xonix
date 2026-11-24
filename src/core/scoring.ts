export interface ScoreEntry {
  initials: string;
  score: number;
  level: number;
  date: string;
}

export function scoreForClaim(cells: number, level: number): number {
  return cells * level;
}

export function levelClearBonus(lives: number, level: number): number {
  return lives * 100 * level;
}

export function qualifiesForTopTen(list: ScoreEntry[], score: number): boolean {
  return list.length < 10 || score > list[list.length - 1].score;
}

export function insertScore(list: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
  return [...list, entry]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 10);
}
