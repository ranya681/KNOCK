export enum GamePhase {
  MENU = 'MENU',
  SETUP = 'SETUP', // New Drag & Drop Phase
  GLASS = 'GLASS',
  CONVEYOR = 'CONVEYOR',
  GAMEOVER = 'GAMEOVER'
}

export enum EntityType {
  BOX = 'BOX', 
  COIN = 'COIN', // Bonus Slot (Add Score)
  HEART = 'HEART', // Penalty Slot (Deduct/Break)
  BOMB = 'BOMB', // Taboo Slot (Game Over)
  ICE = 'ICE', // Frozen Buff
  COLLECTIBLE = 'COLLECTIBLE' // Inside Ice
}

export enum BoxState {
  INTACT = 0,
  CRACKED_1 = 1,
  CRACKED_2 = 2,
  BROKEN = 3
}

export interface GameEntityData {
  id: string;
  type: EntityType;
  revealedItem: EntityType;
  boxState: BoxState;
  positionZ: number;
  laneOffset: number;
  isDead: boolean;
}

export interface ParticleData {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: number;
}