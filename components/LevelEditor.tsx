import React, { useState, useEffect } from 'react';
import { 
  EntityType, LevelData, Entity 
} from '../types';
import { 
  EDITOR_COLS, EDITOR_ROWS, TILE_SIZE, createRect
} from '../constants';
import { Save, X, Eraser, Square, Triangle, Flag, User, Trash2, Ghost, EyeOff, AlertOctagon, ArrowDown } from 'lucide-react';

interface LevelEditorProps {
  onSave: (level: LevelData) => void;
  onCancel: () => void;
  nextId: number;
  initialData?: LevelData | null;
}

// Extended tool types for the editor
type ToolType = EntityType | 'ERASER' | 'PLAYER_START' | 'FAKE_WALL' | 'GHOST_WALL' | 'TRAP_WALL' | 'FALLING_SPIKE' | 'FAKE_GOAL';

const TOOL_DESCRIPTIONS: Record<string, string> = {
  [EntityType.WALL]: "Standard solid wall.",
  [EntityType.SPIKE]: "Static spike. Instant death.",
  [EntityType.GOAL]: "Win condition. Required.",
  'PLAYER_START': "Spawn point. Required.",
  'FAKE_WALL': "Illusion. Looks solid, but isn't collision enabled.",
  'GHOST_WALL': "Invisible wall (10% opacity). Blocks movement.",
  'TRAP_WALL': "Disintegrates shortly after being stepped on.",
  'FALLING_SPIKE': "Falls when the player walks underneath it.",
  'FAKE_GOAL': "A lie. Explodes on contact.",
  'ERASER': "Remove blocks."
};

export default function LevelEditor({ onSave, onCancel, nextId, initialData }: LevelEditorProps) {
  const [grid, setGrid] = useState<Map<string, ToolType>>(new Map());
  const [activeTool, setActiveTool] = useState<ToolType>(EntityType.WALL);
  const [levelName, setLevelName] = useState(`Custom Level ${nextId - 10}`);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getKey = (c: number, r: number) => `${c},${r}`;

  // Initialize from initialData or default
  useEffect(() => {
    if (initialData) {
      setLevelName(initialData.name);
      const newGrid = new Map<string, ToolType>();
      
      // Map Start Pos
      const startC = Math.round(initialData.startPos.x / TILE_SIZE);
      const startR = Math.round(initialData.startPos.y / TILE_SIZE);
      newGrid.set(getKey(startC, startR), 'PLAYER_START');

      // Map Entities
      initialData.entities.forEach(ent => {
        const c = Math.round(ent.x / TILE_SIZE);
        const r = Math.round(ent.y / TILE_SIZE);
        const key = getKey(c, r);

        if (ent.type === EntityType.WALL) {
          if (ent.properties?.ghost) newGrid.set(key, 'GHOST_WALL');
          else if (ent.properties?.trap) newGrid.set(key, 'TRAP_WALL');
          else if (!ent.collidable) newGrid.set(key, 'FAKE_WALL');
          else newGrid.set(key, EntityType.WALL);
        } else if (ent.type === EntityType.SPIKE) {
           if (ent.properties?.fallingStrategy) newGrid.set(key, 'FALLING_SPIKE');
           else newGrid.set(key, EntityType.SPIKE);
        } else if (ent.type === EntityType.GOAL) {
           if (ent.properties?.fake) newGrid.set(key, 'FAKE_GOAL');
           else newGrid.set(key, EntityType.GOAL);
        }
      });
      setGrid(newGrid);
    } else if (grid.size === 0) {
       // Default Auto-fill floor
       const newGrid = new Map();
       for(let c=0; c<EDITOR_COLS; c++) {
         newGrid.set(getKey(c, EDITOR_ROWS - 1), EntityType.WALL);
       }
       setGrid(newGrid);
    }
  }, [initialData]);

  const handlePointerDown = (c: number, r: number) => {
    setIsDrawing(true);
    paint(c, r);
  };

  const handlePointerEnter = (c: number, r: number) => {
    if (isDrawing) paint(c, r);
  };

  const paint = (c: number, r: number) => {
    const key = getKey(c, r);
    const newGrid = new Map(grid);

    if (activeTool === 'ERASER') {
      newGrid.delete(key);
    } else if (activeTool === 'PLAYER_START') {
      // Remove other player starts
      for (const [k, v] of newGrid.entries()) {
        if (v === 'PLAYER_START') newGrid.delete(k);
      }
      newGrid.set(key, activeTool);
    } else {
      newGrid.set(key, activeTool);
    }
    setGrid(newGrid);
  };

  const handleSave = () => {
    setError(null);
    let startPos = { x: 2 * TILE_SIZE, y: 8 * TILE_SIZE };
    let hasStart = false;
    let hasGoal = false;
    const entities: Entity[] = [];

    grid.forEach((type, key) => {
      const [cStr, rStr] = key.split(',');
      const c = parseInt(cStr);
      const r = parseInt(rStr);
      const id = `custom-${c}-${r}-${Date.now()}`;

      if (type === 'PLAYER_START') {
        startPos = { x: c * TILE_SIZE, y: r * TILE_SIZE };
        hasStart = true;
      } else if (type === EntityType.GOAL) {
        hasGoal = true;
        entities.push(createRect(c, r, 1, 1, EntityType.GOAL, id));
      } else if (type === 'FAKE_GOAL') {
        entities.push({
           ...createRect(c, r, 1, 1, EntityType.GOAL, id),
           properties: { fake: true }
        });
      } else if (type === EntityType.WALL) {
        entities.push(createRect(c, r, 1, 1, EntityType.WALL, id));
      } else if (type === 'FAKE_WALL') {
        entities.push({
           ...createRect(c, r, 1, 1, EntityType.WALL, id),
           collidable: false
        });
      } else if (type === 'GHOST_WALL') {
        entities.push({
           ...createRect(c, r, 1, 1, EntityType.WALL, id),
           properties: { ghost: true }
        });
      } else if (type === 'TRAP_WALL') {
        entities.push({
           ...createRect(c, r, 1, 1, EntityType.WALL, id),
           properties: { trap: true }
        });
      } else if (type === EntityType.SPIKE) {
        entities.push(createRect(c, r, 1, 1, EntityType.SPIKE, id));
      } else if (type === 'FALLING_SPIKE') {
        entities.push({
          ...createRect(c, r, 1, 1, EntityType.SPIKE, id),
          properties: { fallingStrategy: 'proximity' }
        });
      }
    });

    if (!hasStart) {
      setError("You must place a Player Start position.");
      return;
    }
    if (!hasGoal) {
      setError("You must place at least one Goal (or Fake Goal, if you're cruel).");
      return;
    }

    const newLevel: LevelData = {
      id: initialData ? initialData.id : nextId,
      name: levelName || "Untitled Level",
      description: "Custom built level.",
      startPos,
      width: EDITOR_COLS * TILE_SIZE,
      height: EDITOR_ROWS * TILE_SIZE,
      entities
    };

    onSave(newLevel);
  };

  const clearGrid = () => {
    if (window.confirm("Clear entire grid?")) {
      setGrid(new Map());
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col md:flex-row text-white">
      {/* Sidebar / Toolkit */}
      <div className="w-full md:w-72 bg-slate-800 p-4 border-r border-slate-700 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
            <User size={24} /> BUILDER
          </h2>
          <input 
            type="text" 
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white focus:outline-none focus:border-red-500 mb-4"
            placeholder="Level Name"
            maxLength={20}
          />
        </div>

        {/* Selected Tool Info */}
        <div className="bg-slate-900/50 p-3 rounded border border-slate-700 text-xs text-slate-300 min-h-[60px]">
          <strong className="block text-white mb-1 uppercase tracking-wider">{activeTool.replace('_', ' ')}</strong>
          {TOOL_DESCRIPTIONS[activeTool] || ""}
        </div>

        <div className="flex flex-col gap-2">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Basics</p>
           <ToolButton 
             active={activeTool === EntityType.WALL} 
             onClick={() => setActiveTool(EntityType.WALL)}
             icon={<Square size={20} />}
             label="Wall"
             color="bg-slate-500"
           />
           <ToolButton 
             active={activeTool === EntityType.SPIKE} 
             onClick={() => setActiveTool(EntityType.SPIKE)}
             icon={<Triangle size={20} />}
             label="Spike"
             color="bg-red-500"
           />
           <ToolButton 
             active={activeTool === EntityType.GOAL} 
             onClick={() => setActiveTool(EntityType.GOAL)}
             icon={<Flag size={20} />}
             label="Goal"
             color="bg-yellow-500"
           />
           <ToolButton 
             active={activeTool === 'PLAYER_START'} 
             onClick={() => setActiveTool('PLAYER_START')}
             icon={<User size={20} />}
             label="Start Pos"
             color="bg-white text-black"
           />

           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4 text-red-400">Deceptions</p>
           
           <ToolButton 
             active={activeTool === 'FAKE_WALL'} 
             onClick={() => setActiveTool('FAKE_WALL')}
             icon={<EyeOff size={20} />}
             label="Fake Wall"
             color="bg-slate-600 border border-dashed border-slate-400"
           />
           <ToolButton 
             active={activeTool === 'GHOST_WALL'} 
             onClick={() => setActiveTool('GHOST_WALL')}
             icon={<Ghost size={20} />}
             label="Ghost Wall (10%)"
             color="bg-slate-800 border border-slate-600"
           />
           <ToolButton 
             active={activeTool === 'TRAP_WALL'} 
             onClick={() => setActiveTool('TRAP_WALL')}
             icon={<AlertOctagon size={20} />}
             label="Trap Wall"
             color="bg-red-900 text-red-200"
           />
            <ToolButton 
             active={activeTool === 'FALLING_SPIKE'} 
             onClick={() => setActiveTool('FALLING_SPIKE')}
             icon={<ArrowDown size={20} />}
             label="Falling Spike"
             color="bg-red-700 text-white"
           />
            <ToolButton 
             active={activeTool === 'FAKE_GOAL'} 
             onClick={() => setActiveTool('FAKE_GOAL')}
             icon={<Flag size={20} />}
             label="Fake Goal"
             color="bg-orange-600 text-white"
           />

           <div className="h-px bg-slate-700 my-4"></div>
           <ToolButton 
             active={activeTool === 'ERASER'} 
             onClick={() => setActiveTool('ERASER')}
             icon={<Eraser size={20} />}
             label="Eraser"
             color="bg-pink-400"
           />
           <button 
             onClick={clearGrid}
             className="flex items-center gap-3 p-3 rounded font-bold transition-all bg-red-900/50 hover:bg-red-900 text-red-200 text-sm"
           >
             <Trash2 size={20} /> Clear All
           </button>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {error && <div className="text-red-400 text-xs font-bold bg-red-900/20 p-2 rounded">{error}</div>}
          <button 
             onClick={handleSave}
             className="flex items-center justify-center gap-2 p-3 rounded font-bold transition-all bg-green-600 hover:bg-green-700 text-white"
          >
             <Save size={20} /> Save Level
          </button>
          <button 
             onClick={onCancel}
             className="flex items-center justify-center gap-2 p-3 rounded font-bold transition-all bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
             <X size={20} /> Cancel
          </button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div 
        className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4"
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
      >
         <div 
           className="grid gap-[1px] bg-slate-800 border-2 border-slate-700 shadow-2xl select-none"
           style={{
             gridTemplateColumns: `repeat(${EDITOR_COLS}, ${TILE_SIZE}px)`,
             gridTemplateRows: `repeat(${EDITOR_ROWS}, ${TILE_SIZE}px)`,
           }}
         >
            {Array.from({ length: EDITOR_ROWS * EDITOR_COLS }).map((_, i) => {
               const c = i % EDITOR_COLS;
               const r = Math.floor(i / EDITOR_COLS);
               const key = getKey(c, r);
               const type = grid.get(key);
               
               let bgColor = 'bg-slate-900';
               let content = null;
               let opacity = '100';

               if (type === EntityType.WALL) bgColor = 'bg-slate-500';
               if (type === 'FAKE_WALL') { bgColor = 'bg-slate-500'; content = <span className="absolute text-[8px] text-black top-0 left-0">FAKE</span>; }
               if (type === 'GHOST_WALL') { bgColor = 'bg-slate-500'; opacity = '20'; }
               if (type === 'TRAP_WALL') { bgColor = 'bg-red-800'; content = <span className="absolute text-[8px] text-white top-0 left-0">TRAP</span>; }
               
               if (type === EntityType.GOAL) bgColor = 'bg-yellow-500';
               if (type === 'FAKE_GOAL') { bgColor = 'bg-orange-600'; content = <span className="absolute text-[8px] text-white bottom-0 right-0">FAKE</span>; }

               if (type === 'PLAYER_START') {
                 bgColor = 'bg-slate-900';
                 content = <div className="w-full h-full bg-white opacity-80" />;
               }
               
               return (
                 <div 
                   key={key}
                   className={`w-[${TILE_SIZE}px] h-[${TILE_SIZE}px] ${bgColor} hover:brightness-110 relative`}
                   style={{ opacity: opacity === '20' ? 0.2 : 1 }}
                   onMouseDown={() => handlePointerDown(c, r)}
                   onMouseEnter={() => handlePointerEnter(c, r)}
                 >
                    {content}
                    {(type === EntityType.SPIKE || type === 'FALLING_SPIKE') && (
                      <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[40px] border-l-transparent border-r-transparent border-b-red-500 relative">
                        {type === 'FALLING_SPIKE' && <span className="absolute top-4 -left-2 text-white font-bold text-xs">V</span>}
                      </div>
                    )}
                    <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
}

const ToolButton = ({ active, onClick, icon, label, color }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 p-2 rounded text-sm font-bold transition-all ${active ? 'ring-2 ring-white scale-105' : 'hover:bg-slate-700'} ${active ? color : 'bg-slate-800 text-slate-400'}`}
  >
    {icon} 
    <span className={active ? 'text-white' : ''}>{label}</span>
  </button>
);