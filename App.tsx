import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import LevelEditor from './components/LevelEditor';
import { GameStatus, LevelData, Vector2 } from './types';
import { LEVELS } from './constants';
import { generateTaunt } from './services/geminiService';
import { RefreshCw, Play, SkipForward, AlertTriangle, Skull, Home, Hammer, Pencil, Download, Upload } from 'lucide-react';

export default function App() {
  const [customLevels, setCustomLevels] = useState<LevelData[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [deathCount, setDeathCount] = useState(0);
  const [taunt, setTaunt] = useState<string>("");
  const [loadingTaunt, setLoadingTaunt] = useState(false);
  
  // State for editing
  const [editingLevel, setEditingLevel] = useState<LevelData | null>(null);

  // File input ref for resetting
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom levels on mount
  useEffect(() => {
    const saved = localStorage.getItem('custom_levels');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomLevels(parsed);
        }
      } catch (e) {
        console.error("Failed to load custom levels", e);
      }
    }
  }, []);

  const allLevels = [...LEVELS, ...customLevels];
  const currentLevel: LevelData = allLevels[currentLevelIndex] || LEVELS[0];

  const startGame = () => {
    setGameStatus(GameStatus.PLAYING);
  };
  
  const selectLevel = (index: number) => {
    setCurrentLevelIndex(index);
    setGameStatus(GameStatus.PLAYING);
  };

  const goToMenu = () => {
    setGameStatus(GameStatus.MENU);
    setEditingLevel(null);
  };

  const openEditor = () => {
    setEditingLevel(null);
    setGameStatus(GameStatus.EDITOR);
  };

  const editLevel = (level: LevelData) => {
    setEditingLevel(level);
    setGameStatus(GameStatus.EDITOR);
  };

  const saveCustomLevel = (newLevel: LevelData) => {
    let updatedLevels;
    
    // Check if updating existing level
    const existingIndex = customLevels.findIndex(l => l.id === newLevel.id);
    if (existingIndex >= 0) {
      updatedLevels = [...customLevels];
      updatedLevels[existingIndex] = newLevel;
    } else {
      updatedLevels = [...customLevels, newLevel];
    }
    
    setCustomLevels(updatedLevels);
    localStorage.setItem('custom_levels', JSON.stringify(updatedLevels));
    setGameStatus(GameStatus.MENU);
    setEditingLevel(null);
  };

  const exportLevels = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customLevels));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "level_devil_custom_levels.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importLevels = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) return;

        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          alert("Invalid file format: Expected a JSON array.");
          return;
        }

        // Basic validation
        const valid = data.every((l: any) => l && typeof l.id === 'number' && l.entities);
        if (!valid) {
          alert("Invalid file content: Some levels are missing required data.");
          return;
        }

        if (window.confirm(`Found ${data.length} custom levels.\nThis will OVERWRITE your current custom levels list.\nContinue?`)) {
          // Force new array reference to ensure React updates
          const newLevels = [...data];
          setCustomLevels(newLevels);
          localStorage.setItem('custom_levels', JSON.stringify(newLevels));
          // Small timeout to allow UI to paint before alert blocks it (optional but helpful)
          setTimeout(() => alert("Levels imported successfully!"), 10);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleDie = async (pos: Vector2, cause: string) => {
    setGameStatus(GameStatus.DEAD);
    setDeathCount(prev => prev + 1);
    
    // Generate Taunt
    setLoadingTaunt(true);
    setTaunt("Thinking of an insult...");
    const msg = await generateTaunt(currentLevel.name, deathCount + 1, cause);
    setTaunt(msg);
    setLoadingTaunt(false);
  };

  const handleWin = () => {
    setGameStatus(GameStatus.WIN);
  };

  const nextLevel = () => {
    if (currentLevelIndex < allLevels.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
      setGameStatus(GameStatus.PLAYING);
    } else {
      setGameStatus(GameStatus.MENU);
      setCurrentLevelIndex(0);
      setDeathCount(0);
    }
  };

  const retry = () => {
    setGameStatus(GameStatus.PLAYING);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col">
      {/* Editor Mode */}
      {gameStatus === GameStatus.EDITOR && (
        <LevelEditor 
          onSave={saveCustomLevel}
          onCancel={goToMenu}
          nextId={11 + customLevels.length}
          initialData={editingLevel}
        />
      )}

      {/* Game Mode */}
      {gameStatus !== GameStatus.EDITOR && (
        <>
          <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur z-20">
            <div className="flex items-center gap-4">
                <button 
                  onClick={goToMenu}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  title="Back to Menu"
                >
                  <Home size={20} />
                </button>
                <h1 className="text-xl font-bold text-red-500 flex items-center gap-2 select-none">
                  <AlertTriangle size={24} /> LEVEL DEVIL
                </h1>
            </div>
            <div className="flex gap-6 text-sm font-mono text-slate-400 select-none">
              <span>LEVEL: {currentLevelIndex + 1}/{allLevels.length}</span>
              <span>DEATHS: <span className="text-red-400">{deathCount}</span></span>
            </div>
          </header>

          <main className="flex-1 relative">
            <GameCanvas 
              level={currentLevel}
              status={gameStatus}
              onDie={handleDie}
              onWin={handleWin}
            />

            {/* Menu Overlay */}
            {gameStatus === GameStatus.MENU && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 z-50 overflow-y-auto">
                <h1 className="text-6xl font-bold text-red-600 mb-4 tracking-tighter select-none">LEVEL DEVIL</h1>
                <p className="text-slate-400 mb-8 text-center max-w-md select-none">
                  A platformer where the level design hates you. <br/>
                  Use WASD or Arrows to move. Space to Jump.
                </p>
                
                <div className="flex gap-4 mb-10">
                  <button 
                    onClick={startGame}
                    className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xl transition-transform hover:scale-105"
                  >
                    <Play size={24} /> START GAME
                  </button>
                  <button 
                    onClick={openEditor}
                    className="flex items-center gap-2 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold text-xl transition-transform hover:scale-105"
                  >
                    <Hammer size={24} /> LEVEL BUILDER
                  </button>
                </div>

                <div className="w-full max-w-4xl border-t border-slate-800 pt-8 flex flex-col items-center">
                    <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest font-bold select-none">Campaign Levels</p>
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {LEVELS.map((level, index) => (
                            <button
                                key={level.id}
                                onClick={() => selectLevel(index)}
                                className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-red-500 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg font-mono font-bold transition-all text-lg"
                                title={level.name}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>

                    {/* Separator */}
                    <div className="w-full h-px bg-slate-800 my-6"></div>

                    <div className="flex flex-col items-center w-full">
                         <div className="flex items-center justify-between w-full max-w-xl px-4 mb-6">
                            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold select-none text-yellow-500">
                              {customLevels.length > 0 ? "Your Custom Levels" : "Custom Levels"}
                            </p>
                            <div className="flex gap-3">
                                {customLevels.length > 0 && (
                                  <button 
                                    onClick={exportLevels} 
                                    className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs font-bold transition-colors border border-slate-700"
                                    title="Backup Levels to JSON"
                                  >
                                    <Download size={14} /> EXPORT
                                  </button>
                                )}
                                <label 
                                  className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs font-bold transition-colors border border-slate-700 cursor-pointer" 
                                  title="Restore Levels from JSON"
                                >
                                  <Upload size={14} /> IMPORT
                                  <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".json" 
                                    onChange={importLevels} 
                                    className="hidden" 
                                  />
                                </label>
                            </div>
                         </div>
                        
                        {customLevels.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-3">
                                {customLevels.map((level, index) => (
                                    <div key={level.id} className="relative group">
                                      <button
                                          onClick={() => selectLevel(LEVELS.length + index)}
                                          className="w-12 h-12 flex items-center justify-center bg-slate-800 border border-yellow-700 hover:border-yellow-500 hover:bg-slate-700 text-yellow-500 hover:text-yellow-200 rounded-lg font-mono font-bold transition-all text-lg relative"
                                          title={level.name}
                                      >
                                          {LEVELS.length + index + 1}
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); editLevel(level); }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Edit Level"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                          <div className="text-slate-600 text-sm italic mb-4">
                            No custom levels created yet. Try the Level Builder!
                          </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-xs text-slate-600 select-none pb-8">
                  Powered by React & Gemini API for AI Taunts
                </div>
              </div>
            )}

            {/* Death Overlay */}
            {gameStatus === GameStatus.DEAD && (
              <div className="absolute inset-0 bg-red-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-50 animate-in fade-in duration-300">
                <Skull size={64} className="text-white mb-4 animate-bounce" />
                <h2 className="text-4xl font-bold text-white mb-2 select-none">YOU DIED</h2>
                
                <div className="bg-black/40 p-6 rounded-lg max-w-lg text-center border-l-4 border-red-500 mb-8">
                  <p className="text-xs uppercase tracking-widest text-red-300 mb-2 select-none">The Developer says:</p>
                  <p className={`text-xl font-mono italic ${loadingTaunt ? 'animate-pulse' : ''}`}>
                    "{taunt}"
                  </p>
                </div>

                <div className="flex gap-4">
                    <button 
                      onClick={goToMenu}
                      className="flex items-center gap-2 px-6 py-3 bg-black/20 hover:bg-black/40 text-white rounded font-bold text-lg transition-colors"
                    >
                      <Home size={20} /> MENU
                    </button>
                    <button 
                      onClick={retry}
                      className="flex items-center gap-2 px-8 py-3 bg-white text-red-900 hover:bg-slate-200 rounded font-bold text-lg transition-transform hover:scale-105"
                    >
                      <RefreshCw size={20} /> TRY AGAIN
                    </button>
                </div>
              </div>
            )}

            {/* Win Overlay */}
            {gameStatus === GameStatus.WIN && (
              <div className="absolute inset-0 bg-yellow-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-50 animate-in zoom-in duration-300">
                <h2 className="text-4xl font-bold text-yellow-300 mb-2 select-none">LEVEL COMPLETE!</h2>
                <p className="text-yellow-100 mb-8 select-none">That wasn't so hard, was it?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={goToMenu}
                    className="flex items-center gap-2 px-6 py-3 bg-black/20 hover:bg-black/40 text-yellow-100 rounded font-bold text-lg transition-colors"
                  >
                    <Home size={20} /> MENU
                  </button>
                  <button 
                    onClick={nextLevel}
                    className="flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-lg transition-transform hover:scale-105"
                  >
                    <SkipForward size={20} /> 
                    {currentLevelIndex < allLevels.length - 1 ? "NEXT LEVEL" : "FINISH GAME"}
                  </button>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}