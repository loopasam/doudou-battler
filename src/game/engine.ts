import {
  STAT_KEYS,
  type BattleCard,
  type GameSnapshot,
  type GameWinner,
  type Side,
  type StatKey,
} from './types';

type RandomSource = () => number;

export class BattleEngine {
  private playerDeck: BattleCard[];
  private aiDeck: BattleCard[];
  private pot: BattleCard[] = [];
  private chooser: Side = 'player';
  private phase: GameSnapshot['phase'] = 'awaiting-choice';
  private round = 1;
  private lastResult: GameSnapshot['lastResult'];
  private gameWinner: GameWinner | undefined;

  constructor(
    cards: BattleCard[],
    private readonly random: RandomSource = Math.random,
  ) {
    if (cards.length < 2 || cards.length % 2 !== 0) {
      throw new Error('The deck must contain an even number of at least two cards.');
    }

    const shuffled = this.shuffle([...cards]);
    const midpoint = shuffled.length / 2;
    this.playerDeck = shuffled.slice(0, midpoint);
    this.aiDeck = shuffled.slice(midpoint);
  }

  getSnapshot(): GameSnapshot {
    return {
      round: this.round,
      chooser: this.chooser,
      phase: this.phase,
      playerCount: this.playerDeck.length,
      aiCount: this.aiDeck.length,
      potCount: this.pot.length,
      playerCard: this.lastResult?.playerCard ?? this.playerDeck[0],
      aiCard: this.lastResult?.aiCard ?? this.aiDeck[0],
      lastResult: this.lastResult,
      gameWinner: this.gameWinner,
    };
  }

  chooseAiStat(): StatKey {
    if (this.phase !== 'awaiting-choice' || this.chooser !== 'ai') {
      throw new Error('The AI can only choose during its own active turn.');
    }

    const card = this.aiDeck[0];
    return STAT_KEYS.reduce((best, candidate) =>
      card.stats[candidate] > card.stats[best] ? candidate : best,
    );
  }

  selectStat(stat: StatKey): GameSnapshot {
    if (this.phase !== 'awaiting-choice') {
      throw new Error('A stat can only be selected at the start of a round.');
    }

    const playerCard = this.playerDeck.shift();
    const aiCard = this.aiDeck.shift();
    if (!playerCard || !aiCard) {
      throw new Error('Both players need a card to start a round.');
    }

    const playerValue = playerCard.stats[stat];
    const aiValue = aiCard.stats[stat];
    const winner = playerValue === aiValue ? 'tie' : playerValue > aiValue ? 'player' : 'ai';
    let capturedCount = 0;

    if (winner === 'tie') {
      this.pot.push(playerCard, aiCard);
    } else {
      const captured = [...this.pot, playerCard, aiCard];
      capturedCount = captured.length;
      this.pot = [];
      const orderedCapture = this.shuffle(captured);
      if (winner === 'player') {
        this.playerDeck.push(...orderedCapture);
      } else {
        this.aiDeck.push(...orderedCapture);
      }
    }

    this.lastResult = { stat, winner, playerCard, aiCard, capturedCount };
    if (winner !== 'tie') {
      this.chooser = winner;
    }
    this.phase = 'resolved';
    return this.getSnapshot();
  }

  advanceRound(): GameSnapshot {
    if (this.phase !== 'resolved') {
      throw new Error('The round can only advance after it has been resolved.');
    }

    if (this.playerDeck.length === 0 || this.aiDeck.length === 0) {
      this.finishGame();
      return this.getSnapshot();
    }

    this.round += 1;
    this.lastResult = undefined;
    this.phase = 'awaiting-choice';
    return this.getSnapshot();
  }

  private finishGame(): void {
    if (this.playerDeck.length === 0 && this.aiDeck.length > 0) {
      this.aiDeck.push(...this.pot);
      this.pot = [];
      this.gameWinner = 'ai';
    } else if (this.aiDeck.length === 0 && this.playerDeck.length > 0) {
      this.playerDeck.push(...this.pot);
      this.pot = [];
      this.gameWinner = 'player';
    } else {
      this.gameWinner = 'draw';
    }
    this.phase = 'game-over';
  }

  private shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }
}
