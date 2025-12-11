export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum EntityType {
  WALL = 'WALL',
  SPIKE = 'SPIKE',
  GOAL = 'GOAL',
  TRIGGER = 'TRIGGER',
  DECORATION = 'DECORATION',
  MOVING_PLATFORM = 'MOVING_PLATFORM'
}

export interface Entity extends Rect {
  id: string;
  type: EntityType;
  color?: string;
  visible: boolean;
  collidable: boolean;
  properties?: Record<string, any>;
  vx?: number;
  vy?: number;
}

export interface LevelData {
  id: number;
  name: string;
  startPos: Vector2;
  entities: Entity[];
  width: number;
  height: number;
  description: string;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  DEAD = 'DEAD',
  WIN = 'WIN',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  EDITOR = 'EDITOR'
}

export interface PlayerState {
  pos: Vector2;
  vel: Vector2;
  isGrounded: boolean;
  dead: boolean;
  faceRight: boolean;
}