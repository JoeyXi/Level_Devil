import React, { useRef, useEffect, useCallback } from 'react';
import { 
  Vector2, Rect, Entity, EntityType, GameStatus, PlayerState, LevelData 
} from '../types';
import { 
  GRAVITY, JUMP_FORCE, MOVE_SPEED, FRICTION, MAX_FALL_SPEED, 
  PLAYER_SIZE, TILE_SIZE, COLOR_BG, COLOR_GOAL, COLOR_PLAYER, 
  COLOR_SPIKE, COLOR_WALL 
} from '../constants';

interface GameCanvasProps {
  level: LevelData;
  status: GameStatus;
  onDie: (pos: Vector2, cause: string) => void;
  onWin: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;     // 0.0 to 1.0
  decay: number;    // speed of life loss
  color: string;
  size: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ level, status, onDie, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs (Mutable for performance)
  const playerRef = useRef<PlayerState>({
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    isGrounded: false,
    dead: false,
    faceRight: true
  });

  // Visual State Refs
  const particlesRef = useRef<Particle[]>([]);
  const eyeBlinkTimerRef = useRef<number>(0);
  const nextBlinkTimeRef = useRef<number>(Math.random() * 200 + 100);
  
  const keysRef = useRef<Record<string, boolean>>({});
  const entitiesRef = useRef<Entity[]>([]);
  const frameCountRef = useRef<number>(0);

  // Sound Effects
  const playExplosionSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Create noise buffer for "Firecracker" crack
      const bufferSize = ctx.sampleRate * 0.2; // Short buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = ctx.createGain();
      
      // Filter to keep it crisp but not too harsh
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime;
      
      // Sharp attack and decay envelope
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15); 

      noise.start(t);
      noise.stop(t + 0.15);
      
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x: x + PLAYER_SIZE / 2,
        y: y + PLAYER_SIZE / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        color: i % 2 === 0 ? COLOR_PLAYER : '#ef4444', // Mix of white and red debris
        size: Math.random() * 6 + 2
      });
    }
  };

  // Initialize Level
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Reset Entities
    entitiesRef.current = JSON.parse(JSON.stringify(level.entities));
    
    // Only reset player if we are starting fresh or playing, 
    // NOT if we just died (so we can see the explosion at the death spot)
    if (status !== GameStatus.DEAD) {
      playerRef.current = {
        pos: { ...level.startPos },
        vel: { x: 0, y: 0 },
        isGrounded: false,
        dead: false,
        faceRight: true
      };
      particlesRef.current = [];
      frameCountRef.current = 0;
    }
  }, [level, status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // AABB Collision Detection
  const checkCollision = (rect1: Rect, rect2: Rect): boolean => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  // Level Specific Mechanics
  const updateLevelMechanics = (levelId: number) => {
    const player = playerRef.current;
    const entities = entitiesRef.current;

    // --- GENERIC MECHANICS (For Custom Levels) ---
    
    // Generic: Trap Walls (Crumble when touched)
    // We iterate through entities that have 'trap' property
    entities.filter(e => e.properties?.trap).forEach(trap => {
         const playerRect = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
         // Slightly larger hit box for the trap trigger from top
         const trapRect = { x: trap.x, y: trap.y - 5, w: trap.w, h: trap.h };
         
         if (trap.visible && trap.collidable) {
            if (checkCollision(playerRect, trapRect) && player.isGrounded) {
                 if (!trap.properties!.triggered) {
                   trap.properties!.triggered = true;
                   trap.properties!.timer = 0;
                 }
             }
         }
         
         if (trap.properties!.triggered) {
           trap.properties!.timer += 1;
           // Shake effect logic is in draw
           if (trap.properties!.timer > 20) {
             trap.visible = false;
             trap.collidable = false;
           }
         }
    });

    // Generic: Falling Spikes (Proximity triggered)
    entities.filter(e => e.properties?.fallingStrategy === 'proximity').forEach(spike => {
         if (!spike.properties!.triggered) {
            // Check if player is underneath within a vertical range
            const xDist = Math.abs((spike.x + spike.w/2) - (player.pos.x + PLAYER_SIZE/2));
            const isUnder = xDist < PLAYER_SIZE; 
            const isBelow = player.pos.y > spike.y;
            
            if (isUnder && isBelow) {
               spike.properties!.triggered = true;
            }
         } else {
            // Fall
            spike.y += 9; // Fall speed
         }
    });


    // --- HARDCODED CAMPAIGN LEVELS ---

    // Level 1: Trust Issues (Hidden Block)
    if (levelId === 1) {
      if (player.pos.x > 7 * TILE_SIZE && player.pos.y < 8 * TILE_SIZE) {
        const block = entities.find(e => e.id === 'troll-block');
        if (block) block.visible = true;
      }
    }

    // Level 2: Commitment Issues (Moving Goal)
    if (levelId === 2) {
      if (player.pos.x > 8 * TILE_SIZE) {
        const goal = entities.find(e => e.id === 'goal');
        if (goal && goal.x < 18 * TILE_SIZE) goal.x += 8;
      }
    }

    // Level 3: Sandwich (Falling Spikes)
    if (levelId === 3) {
      entities.filter(e => e.id.includes('fall-spike')).forEach(spike => {
        if (!spike.properties) spike.properties = {};
        if (!spike.properties.falling && !spike.properties.shaking) {
          if (Math.abs(player.pos.x - spike.x) < 2.5 * TILE_SIZE) { 
            spike.properties.shaking = true;
            spike.properties.shakeTimer = 0;
          }
        }
        if (spike.properties.shaking) {
          spike.properties.shakeTimer += 1;
          const jitterX = (Math.random() - 0.5) * 8;
          spike.properties.displayX = spike.x + jitterX;
          if (spike.properties.shakeTimer > 30) { 
            spike.properties.shaking = false;
            spike.properties.falling = true;
            spike.properties.displayX = spike.x; 
          }
        } else {
            spike.properties.displayX = spike.x;
        }
        if (spike.properties.falling) spike.y += 9;
      });
    }

    // Level 4: Ghosted (Disappearing platform)
    if (levelId === 4) {
      const trap = entities.find(e => e.id === 'trap-plat');
      if (trap) {
         // Re-using Generic Trap Logic logic basically, but hardcoded ID for safety in legacy levels
         const playerRect = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
         const trapRect = { x: trap.x, y: trap.y - 5, w: trap.w, h: trap.h };
         
         if (checkCollision(playerRect, trapRect) && player.isGrounded) {
             if (!trap.properties) trap.properties = {};
             if (!trap.properties.triggered) {
               trap.properties.triggered = true;
               trap.properties.timer = 0;
             }
         }
         if (trap.properties?.triggered) {
           trap.properties.timer += 1;
           if (trap.properties.timer > 20) {
             trap.visible = false;
             trap.collidable = false;
           }
         }
      }
    }
    
    // Level 5: Blind Faith (Pulsing opacity for hint)
    if (levelId === 5) {
      const time = frameCountRef.current / 15;
      const opacity = 0.65 + Math.sin(time) * 0.35; 
      entities.filter(e => e.id.includes('inv-spike')).forEach(spike => {
         if (!spike.properties) spike.properties = {};
         spike.properties.opacity = opacity;
      });
    }

    // Level 7: Timber (Falling Pillar)
    if (levelId === 7) {
      const pillar = entities.find(e => e.id === 'falling-pillar');
      if (pillar) {
        if (!pillar.properties) pillar.properties = {};
        
        // Trigger
        if (!pillar.properties.triggered && player.pos.x > 5 * TILE_SIZE) {
          pillar.properties.triggered = true;
        }
        
        if (pillar.properties.triggered) {
          if (!pillar.properties.vy) pillar.properties.vy = 0;
          pillar.properties.vy += 0.8; // Gravity
          pillar.y += pillar.properties.vy;
          
          // Stop at floor (y=12 tiles = 480)
          const floorY = 12 * TILE_SIZE;
          if (pillar.y + pillar.h >= floorY) {
            pillar.y = floorY - pillar.h;
            pillar.properties.vy = 0;
            // Shake effect on landing?
          }
        }
      }
    }

    // Level 8: The Press (Crushing Ceiling)
    if (levelId === 8) {
      const ceiling = entities.find(e => e.id === 'crushing-ceiling');
      if (ceiling) {
        ceiling.y += 0.6; // Constant slow descent
      }
    }

    // Level 9: Shark (Tracking Spike)
    if (levelId === 9) {
      const shark = entities.find(e => e.id === 'shark-spike');
      if (shark) {
        // Track X
        shark.x = player.pos.x + (PLAYER_SIZE - shark.w) / 2;
        
        // Attack Logic
        const isMoving = Math.abs(player.vel.x) > 0.1;
        const floorY = 12 * TILE_SIZE;
        
        if (!isMoving) {
          // Attack up
          shark.y = Math.max(floorY - 30, shark.y - 5);
        } else {
          // Retreat down
          shark.y = Math.min(floorY + 10, shark.y + 2);
        }
      }
    }

    // Level 10: Level Devil (Teleporting Goal)
    if (levelId === 10) {
      const fakeGoal = entities.find(e => e.id === 'fake-goal');
      if (fakeGoal && fakeGoal.visible) {
        const pRect = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
        if (checkCollision(pRect, fakeGoal)) {
          // Trigger the trap!
          fakeGoal.visible = false;
          fakeGoal.collidable = false;
          spawnParticles(fakeGoal.x, fakeGoal.y); // Poof!
          
          // Reveal real goal and path
          const realGoal = entities.find(e => e.id === 'real-goal');
          if (realGoal) {
            realGoal.visible = true;
            realGoal.collidable = true;
          }
          entities.forEach(e => {
            if (['s1', 's2', 's3', 's4'].includes(e.id)) {
              e.visible = true; // Show stairs
            }
          });
        }
      }
    }
  };

  const handleDeath = (cause: string) => {
    if (playerRef.current.dead) return; // Prevent double death
    playerRef.current.dead = true;
    spawnParticles(playerRef.current.pos.x, playerRef.current.pos.y);
    playExplosionSound();
    onDie(playerRef.current.pos, cause);
  };

  // Main Game Loop
  const update = useCallback(() => {
    // 0. Update Particles (Always run, even if dead)
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY * 0.5; // Particles have weight
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 0.5 Update Eye Blinking
    eyeBlinkTimerRef.current++;
    if (eyeBlinkTimerRef.current > nextBlinkTimeRef.current) {
      // Reset blink logic
      if (eyeBlinkTimerRef.current > nextBlinkTimeRef.current + 10) { // Blink lasts 10 frames
         eyeBlinkTimerRef.current = 0;
         nextBlinkTimeRef.current = Math.random() * 200 + 100;
      }
    }

    // Stop game logic if not playing
    if (status !== GameStatus.PLAYING) return;
    
    const player = playerRef.current;
    const entities = entitiesRef.current;
    
    // 1. Apply Physics
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
      player.vel.x = MOVE_SPEED;
      player.faceRight = true;
    } else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
      player.vel.x = -MOVE_SPEED;
      player.faceRight = false;
    } else {
      player.vel.x *= FRICTION; 
      if (Math.abs(player.vel.x) < 0.1) player.vel.x = 0;
    }

    if ((keysRef.current['Space'] || keysRef.current['ArrowUp'] || keysRef.current['KeyW']) && player.isGrounded) {
      player.vel.y = JUMP_FORCE;
      player.isGrounded = false;
    }

    player.vel.y += GRAVITY;
    if (player.vel.y > MAX_FALL_SPEED) player.vel.y = MAX_FALL_SPEED;

    // 2. Update Level Mechanics
    updateLevelMechanics(level.id);

    // 3. Horizontal Movement & Collision
    player.pos.x += player.vel.x;
    if (player.pos.x < 0) player.pos.x = 0;
    if (player.pos.x > level.width - PLAYER_SIZE) player.pos.x = level.width - PLAYER_SIZE;

    const playerRectH = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
    
    for (const ent of entities) {
      // Logic for Fake Walls handled here (they are not collidable)
      if (!ent.collidable) continue; 
      
      if (ent.type === EntityType.WALL && checkCollision(playerRectH, ent)) {
        if (player.vel.x > 0) {
          player.pos.x = ent.x - PLAYER_SIZE;
        } else if (player.vel.x < 0) {
          player.pos.x = ent.x + ent.w;
        }
        player.vel.x = 0;
      }
    }

    // 4. Vertical Movement & Collision
    player.pos.y += player.vel.y;
    
    if (player.pos.y > level.height + 100) {
      handleDeath("Fell into the void");
      return;
    }

    let groundedThisFrame = false;
    const playerRectV = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };

    for (const ent of entities) {
      if (!ent.collidable) continue;
      if (ent.type === EntityType.WALL && checkCollision(playerRectV, ent)) {
        if (player.vel.y > 0) { 
          player.pos.y = ent.y - PLAYER_SIZE;
          player.vel.y = 0;
          groundedThisFrame = true;
        } else if (player.vel.y < 0) { 
          player.pos.y = ent.y + ent.h;
          player.vel.y = 0;
        }
      }
    }
    player.isGrounded = groundedThisFrame;

    // 5. Trigger/Spike/Goal Checks
    const finalRect = { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
    const spikePlayerHitbox = { 
      x: finalRect.x + 6, y: finalRect.y + 6, 
      w: finalRect.w - 12, h: finalRect.h - 12 
    };

    for (const ent of entities) {
      if (ent.type === EntityType.SPIKE && checkCollision(spikePlayerHitbox, ent)) {
        handleDeath("Spiked");
        return;
      }
      if (ent.type === EntityType.GOAL && checkCollision(finalRect, ent)) {
        // Special case for Fake Goal
        if (ent.properties?.fake) {
            handleDeath("It was a trap!");
            return;
        }
        // Special case for Level 10 Fake Goal legacy id check (optional, but keep for safety)
        if (ent.id === 'fake-goal') continue; 

        onWin();
        return;
      }
    }

    frameCountRef.current++;
  }, [level, status, onDie, onWin]);

  // Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = level.width;
    canvas.height = level.height;

    // Clear
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Entities
    entitiesRef.current.forEach(ent => {
      // Ghost Wall rendering
      if (ent.properties?.ghost) {
         ctx.globalAlpha = 0.15;
      } else {
         ctx.globalAlpha = 1.0;
         if (!ent.visible) return;
      }

      if (ent.type === EntityType.WALL) {
        ctx.fillStyle = COLOR_WALL;
        
        // Trap shake effect
        if ((ent.properties?.triggered && ent.id === 'trap-plat') || ent.properties?.triggered && ent.properties.trap) {
          ctx.fillStyle = '#b91c1c'; 
          const shake = (Math.random() - 0.5) * 4;
          ctx.save();
          ctx.translate(shake, 0);
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
          ctx.restore();
          ctx.globalAlpha = 1.0;
          return;
        }

        ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);

      } else if (ent.type === EntityType.SPIKE) {
        const drawX = ent.properties?.displayX ?? ent.x;
        const drawY = ent.y;
        const opacity = ent.properties?.opacity !== undefined ? ent.properties.opacity : 1.0;

        ctx.save();
        // Determine orientation
        let orientation = 'up'; // default
        if (ent.id.includes('fall') || ent.id.includes('ceil') || ent.properties?.fallingStrategy) orientation = 'down';
        if (ent.id === 'shark-spike') orientation = 'shark'; // Always point up but dynamic

        ctx.beginPath();
        if (orientation === 'down') {
           ctx.moveTo(drawX, drawY);
           ctx.lineTo(drawX + ent.w, drawY);
           ctx.lineTo(drawX + ent.w / 2, drawY + ent.h);
        } else {
           ctx.moveTo(drawX, drawY + ent.h);
           ctx.lineTo(drawX + ent.w, drawY + ent.h);
           ctx.lineTo(drawX + ent.w / 2, drawY);
        }
        ctx.closePath();
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = COLOR_SPIKE;
        ctx.fill();
        ctx.globalAlpha = Math.max(0.4, opacity); 
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

      } else if (ent.type === EntityType.GOAL) {
        // Fake Goals look exactly the same
        ctx.fillStyle = COLOR_GOAL;
        ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ent.x + 5 - pulse/2, ent.y + 5 - pulse/2, ent.w - 10 + pulse, ent.h - 10 + pulse);
      }
      ctx.globalAlpha = 1.0;
    });

    // Draw Particles (Explosion)
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // Draw Player
    const p = playerRef.current;
    if (!p.dead) {
      ctx.fillStyle = COLOR_PLAYER;
      ctx.fillRect(p.pos.x, p.pos.y, PLAYER_SIZE, PLAYER_SIZE);
      
      // Eyes Logic
      const isBlinking = eyeBlinkTimerRef.current > nextBlinkTimeRef.current;
      
      if (!isBlinking) {
        ctx.fillStyle = '#000';
        const eyeOffsetX = p.faceRight ? 18 : 6;
        ctx.fillRect(p.pos.x + eyeOffsetX, p.pos.y + 8, 4, 4);
        ctx.fillRect(p.pos.x + eyeOffsetX + (p.faceRight ? -10 : 10), p.pos.y + 8, 4, 4);
      } else {
        // Draw closed eyes (thin lines)
        ctx.fillStyle = '#000';
        const eyeOffsetX = p.faceRight ? 18 : 6;
        ctx.fillRect(p.pos.x + eyeOffsetX, p.pos.y + 10, 4, 2);
        ctx.fillRect(p.pos.x + eyeOffsetX + (p.faceRight ? -10 : 10), p.pos.y + 10, 4, 2);
      }
    }
  }, [level]);

  // Tick
  useEffect(() => {
    const tick = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(tick);
    };
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900">
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full shadow-2xl border-4 border-slate-700 rounded-lg"
      />
      
      {/* Mobile Controls Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-4 md:hidden z-10">
        <button 
          className="w-16 h-16 bg-white/10 rounded-full text-white active:bg-white/30 backdrop-blur select-none"
          onTouchStart={() => { keysRef.current['ArrowLeft'] = true; }}
          onTouchEnd={() => { keysRef.current['ArrowLeft'] = false; }}
        >←</button>
        <button 
          className="w-16 h-16 bg-white/10 rounded-full text-white active:bg-white/30 backdrop-blur select-none"
          onTouchStart={() => { keysRef.current['ArrowRight'] = true; }}
          onTouchEnd={() => { keysRef.current['ArrowRight'] = false; }}
        >→</button>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-4 md:hidden z-10">
         <button 
          className="w-20 h-20 bg-blue-500/30 rounded-full text-white active:bg-blue-500/50 backdrop-blur font-bold select-none"
          onTouchStart={() => { keysRef.current['Space'] = true; }}
          onTouchEnd={() => { keysRef.current['Space'] = false; }}
        >JUMP</button>
      </div>
    </div>
  );
};

export default GameCanvas;