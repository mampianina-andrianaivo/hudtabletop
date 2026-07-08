export interface SlotData {
  id: string;
  image: string | null;
  name?: string;
  description: string;
  diceTarget: number;
  diceCondition: 'sup' | 'inf' | 'exact';
  noDice: boolean;
  chakraCost: number;
  noCost: boolean;
  isGreyedOut: boolean;
  slotNumber: number;
  greenGaugeMax?: number;
  currentGreenGauge?: boolean[];
}

export interface CustomStat {
  name: string;
  value: string;
  isVisible: boolean;
}

export interface GameState {
  maxHp: number;
  currentHp: boolean[];
  maxChakra: number;
  currentChakra: boolean[];
  characterImage: string | null;
  characterName: string;
  characterDescription: string;
  customStats: CustomStat[];
  playerNotes: string;
  leftSlots: SlotData[];
  rightSlots: SlotData[];
  hudColor: string;
  isLightMode: boolean;
}
