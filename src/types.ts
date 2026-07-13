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
  isHidden?: boolean;
  slotNumber: number;
  greenGaugeMax?: number;
  currentGreenGauge?: boolean[];
  costColor?: 'red' | 'blue' | 'orange' | 'violet' | 'white';
}

export interface Requirement {
  id: string;
  text: string;
  isActive: boolean;
  isSub?: boolean;
}

export interface CustomStat {
  name: string;
  value: string;
  isVisible: boolean;
  modifier?: number;
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
  slotScale?: number;
  slotOffsetY?: number;
  characterScale?: number;
  characterOffsetY?: number;
  isImmersiveMode?: boolean;
  useStatBars?: boolean;
  statBarsMax?: number;
  useStatBars2?: boolean;
  statBarsMax2?: number;
  showHp?: boolean;
  showChakra?: boolean;
  showOrange?: boolean;
  maxOrange?: number;
  currentOrange?: boolean[];
  showViolet?: boolean;
  maxViolet?: number;
  currentViolet?: boolean[];
  counterHp?: boolean;
  counterChakra?: boolean;
  counterOrange?: boolean;
  counterViolet?: boolean;
  labelHp?: string;
  labelChakra?: string;
  labelOrange?: string;
  labelViolet?: string;
  slotTextSize?: number;
  charStatsTextSize?: number;
  slotCostColor?: 'red' | 'blue' | 'orange' | 'violet' | 'white';
  slotOffsetX?: number;
  characterDiceType?: 'd6' | 'd8' | 'd12' | 'd20';
  geminiApiKey?: string;
  geminiGlobalPrompt?: string;
  imageService?: 'puter' | 'gemini';
  puterModel?: string;
  gmNotes1?: string;
  gmNotes1b?: string;
  gmNotes2?: string;
  gmCustomDiceMin?: number;
  gmCustomDiceMax?: number;
  requirements?: Requirement[];
}
