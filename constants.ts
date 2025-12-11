import { LevelData, EntityType } from './types';

// Physics
export const GRAVITY = 0.6;
export const JUMP_FORCE = -11; // Increased slightly for snappier feel
export const MOVE_SPEED = 5;
export const FRICTION = 0.8;
export const MAX_FALL_SPEED = 15;
export const PLAYER_SIZE = 30;
export const TILE_SIZE = 40;

// Editor settings
export const EDITOR_COLS = 30;
export const EDITOR_ROWS = 15;

// Colors
export const COLOR_WALL = '#64748b';
export const COLOR_SPIKE = '#ef4444';
export const COLOR_GOAL = '#eab308';
export const COLOR_PLAYER = '#f8fafc';
export const COLOR_BG = '#0f172a';

// Helper to create grid-based levels easily
export const createRect = (x: number, y: number, w: number, h: number, type: EntityType, id: string): any => ({
  x: x * TILE_SIZE,
  y: y * TILE_SIZE,
  w: w * TILE_SIZE,
  h: h * TILE_SIZE,
  type,
  id,
  visible: true,
  collidable: true
});

// Level 1: The Trust Issue
const level1: LevelData = {
  id: 1,
  name: "Trust Issues",
  description: "It looks safe. It is not.",
  startPos: { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    // Floor
    createRect(0, 10, 8, 2, EntityType.WALL, 'floor-left'),
    createRect(12, 10, 8, 2, EntityType.WALL, 'floor-right'),
    // Spikes in pit
    createRect(8, 11, 4, 1, EntityType.SPIKE, 'pit-spikes'),
    // Walls
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    // Goal
    createRect(17, 8, 1, 2, EntityType.GOAL, 'goal'),
    // THE TROLL: Hidden block in the air
    {
      ...createRect(8, 6, 4, 1, EntityType.WALL, 'troll-block'),
      visible: false, // Invisible initially
      collidable: true
    }
  ]
};

// Level 2: The Moving Goal
const level2: LevelData = {
  id: 2,
  name: "Commitment Issues",
  description: "Why are you running?",
  startPos: { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    
    // Solid Floor
    createRect(0, 10, 20, 2, EntityType.WALL, 'floor'),

    // HIDDEN SPIKE: Placed exactly where the goal starts.
    // When the goal runs away, this is revealed.
    createRect(14, 9, 1, 1, EntityType.SPIKE, 'hidden-spike'),

    // The Goal (starts normal, covers the spike visually)
    createRect(14, 8, 1, 2, EntityType.GOAL, 'goal'),
  ]
};

// Level 3: Sandwich
const level3: LevelData = {
  id: 3,
  name: "Sandwich",
  description: "Jump and die. Don't jump and die.",
  startPos: { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 10, 20, 2, EntityType.WALL, 'floor'),
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    createRect(17, 8, 1, 2, EntityType.GOAL, 'goal'),
    
    // Ground Spikes: Moved to y=9 to sit ON TOP of floor (y=10)
    createRect(8, 9, 1, 1, EntityType.SPIKE, 'ground-spike-1'),
    createRect(13, 9, 1, 1, EntityType.SPIKE, 'ground-spike-2'),

    // Falling Spikes: Placed above to catch jumpers
    createRect(8, 4, 1, 1, EntityType.SPIKE, 'fall-spike-1'),
    createRect(13, 4, 1, 1, EntityType.SPIKE, 'fall-spike-2'),
  ]
};

// Level 4: Ghosted
const level4: LevelData = {
  id: 4,
  name: "Ghosted",
  description: "Too slow. Also, watch your head.",
  startPos: { x: 2 * TILE_SIZE, y: 5 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 15 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 15, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 15, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    
    // Start platform
    createRect(0, 7, 4, 1, EntityType.WALL, 'start-plat'),
    
    // Spikes at bottom
    createRect(0, 14, 20, 1, EntityType.SPIKE, 'floor-spikes'),
    
    // SEMI-INVISIBLE CEILING BLOCK: Blocks high jumps to the middle platform
    {
      ...createRect(5, 4, 1, 1, EntityType.WALL, 'inv-blocker'),
      visible: true,
      properties: { ghost: true } 
    },

    // Middle platform (The Trap) - Disappears very fast
    createRect(7, 7, 5, 1, EntityType.WALL, 'trap-plat'),
    
    // Goal platform
    createRect(16, 7, 4, 1, EntityType.WALL, 'goal-plat'),
    createRect(17, 5, 1, 2, EntityType.GOAL, 'goal'),
  ]
};

// Level 5: Blind Faith
const level5: LevelData = {
  id: 5,
  name: "Blind Faith",
  description: "Some floors are fake. Some air is solid.",
  startPos: { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    createRect(17, 8, 1, 2, EntityType.GOAL, 'goal'),

    // Section 1: Looks safe, but middle is fake
    createRect(0, 10, 6, 2, EntityType.WALL, 'floor-1'),
    
    // FAKE FLOOR: Looks exactly like wall, but not collidable
    {
      ...createRect(6, 10, 3, 2, EntityType.WALL, 'fake-floor'),
      collidable: false, 
    },
    // Spikes under fake floor
    createRect(6, 11, 3, 1, EntityType.SPIKE, 'pit-spikes'),

    // Real floor resumes
    createRect(9, 10, 11, 2, EntityType.WALL, 'floor-2'),
    
    // INVISIBLE WALL: Blocks the jump over the fake floor if you jump too high/far
    {
       ...createRect(9, 7, 1, 2, EntityType.WALL, 'inv-wall'),
       visible: true,
       properties: { ghost: true } // Slight hint
    },
    
    // INVISIBLE SPIKE on the landing spot
    createRect(11, 10, 1, 1, EntityType.SPIKE, 'inv-spike-1'),
  ]
};

// Level 6: Glass Bridge
// Guess which blocks are real.
const level6: LevelData = {
  id: 6,
  name: "Glass Bridge",
  description: "50/50. Good luck.",
  startPos: { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    createRect(0, 10, 4, 2, EntityType.WALL, 'start'),
    createRect(16, 10, 4, 2, EntityType.WALL, 'end'),
    createRect(17, 8, 1, 2, EntityType.GOAL, 'goal'),
    
    // Spikes below
    createRect(4, 11, 12, 1, EntityType.SPIKE, 'spikes'),

    // The Bridge
    // 1: Real
    createRect(5, 10, 2, 1, EntityType.WALL, 'b1'),
    // 2: Fake
    { ...createRect(8, 10, 2, 1, EntityType.WALL, 'b2-fake'), collidable: false },
    // 3: Real
    createRect(11, 10, 2, 1, EntityType.WALL, 'b3'),
    // 4: Fake
    { ...createRect(14, 10, 2, 1, EntityType.WALL, 'b4-fake'), collidable: false },
  ]
};

// Level 7: Timber
// A huge pillar falls from the sky.
const level7: LevelData = {
  id: 7,
  name: "Timber!",
  description: "Run! Don't stop.",
  startPos: { x: 2 * TILE_SIZE, y: 10 * TILE_SIZE },
  width: 20 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(19, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 20, 1, EntityType.WALL, 'ceiling'),
    createRect(0, 12, 20, 1, EntityType.WALL, 'floor'), // Floor is y=12
    createRect(17, 10, 1, 2, EntityType.GOAL, 'goal'),

    // The Pillar (Starts in the sky)
    {
      ...createRect(10, 1, 2, 4, EntityType.WALL, 'falling-pillar'),
      properties: { falling: false, triggered: false }
    },
    
    // Obstacle to slow you down slightly
    createRect(6, 11, 1, 1, EntityType.SPIKE, 'ground-spike'),
  ]
};

// Level 8: The Press
// Ceiling lowers.
const level8: LevelData = {
  id: 8,
  name: "The Press",
  description: "Don't feel the pressure.",
  startPos: { x: 2 * TILE_SIZE, y: 10 * TILE_SIZE },
  width: 25 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(24, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 12, 25, 1, EntityType.WALL, 'floor'),
    createRect(22, 10, 1, 2, EntityType.GOAL, 'goal'),

    // The Crushing Ceiling
    createRect(0, 0, 25, 4, EntityType.WALL, 'crushing-ceiling'),

    // Floor Spikes to force jumps (which puts you closer to ceiling)
    createRect(8, 11, 1, 1, EntityType.SPIKE, 's1'),
    createRect(14, 11, 1, 1, EntityType.SPIKE, 's2'),
    createRect(19, 11, 1, 1, EntityType.SPIKE, 's3'),
  ]
};

// Level 9: The Shark
// Spike follows you.
const level9: LevelData = {
  id: 9,
  name: "Shark",
  description: "Keep moving.",
  startPos: { x: 2 * TILE_SIZE, y: 10 * TILE_SIZE },
  width: 25 * TILE_SIZE,
  height: 12 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 12, EntityType.WALL, 'left-wall'),
    createRect(24, 0, 1, 12, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 25, 1, EntityType.WALL, 'ceiling'),
    
    // Thin floor to allow spike to poke through visually if we wanted, 
    // but here we just make the spike overlay.
    createRect(0, 12, 25, 1, EntityType.WALL, 'floor'),
    
    createRect(22, 10, 1, 2, EntityType.GOAL, 'goal'),

    // The Shark Spike
    {
      ...createRect(2, 12, 1, 1, EntityType.SPIKE, 'shark-spike'),
      properties: { active: true }
    },
    
    // Walls to jump over (forcing you to slow down potentially)
    createRect(10, 11, 1, 1, EntityType.WALL, 'bump1'),
    createRect(18, 10, 1, 2, EntityType.WALL, 'bump2'),
  ]
};

// Level 10: Level Devil
// Teleporting goal + Invisible path.
const level10: LevelData = {
  id: 10,
  name: "Level Devil",
  description: "Everything is a lie.",
  startPos: { x: 2 * TILE_SIZE, y: 10 * TILE_SIZE },
  width: 22 * TILE_SIZE,
  height: 14 * TILE_SIZE,
  entities: [
    createRect(0, 0, 1, 14, EntityType.WALL, 'left-wall'),
    createRect(21, 0, 1, 14, EntityType.WALL, 'right-wall'),
    createRect(0, 0, 22, 1, EntityType.WALL, 'ceiling'),
    
    // Start Floor
    createRect(0, 12, 8, 2, EntityType.WALL, 'floor-1'),
    
    // Middle Gap with invisible wall logic (like level 5/4)
    createRect(8, 13, 14, 1, EntityType.SPIKE, 'pit'),
    
    // Platform with "Fake" Goal
    createRect(16, 10, 4, 1, EntityType.WALL, 'plat'),
    // The Bait Goal
    createRect(18, 8, 1, 2, EntityType.GOAL, 'fake-goal'),

    // The Hidden Real Goal (High up at start)
    // Initially invisible/unreachable? No, let's make it visible but hard to reach.
    {
       ...createRect(2, 3, 1, 2, EntityType.GOAL, 'real-goal'),
       visible: false, // Appears after touching fake goal
       collidable: false
    },

    // Invisible Stairs to get back to start
    // Visible only after triggering fake goal
    {...createRect(14, 9, 2, 1, EntityType.WALL, 's1'), visible: false, collidable: true },
    {...createRect(12, 7, 2, 1, EntityType.WALL, 's2'), visible: false, collidable: true },
    {...createRect(10, 5, 2, 1, EntityType.WALL, 's3'), visible: false, collidable: true },
    {...createRect(6, 4, 2, 1, EntityType.WALL, 's4'), visible: false, collidable: true },
  ]
};

export const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];