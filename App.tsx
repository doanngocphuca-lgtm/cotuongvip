import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Color, Piece, BoardState, Move, GameMode, AIDifficulty, GameSettings, OnlineState
} from './types';
import { BOARD_ROWS, BOARD_COLS, INITIAL_PIECES, CHINESE_NAMES } from './constants';
import { XiangqiRules } from './logic/XiangqiRules';
import { AIEngine } from './logic/AIEngine';
import { AudioService } from './logic/AudioService';
import { socket } from "./services/socket";

// --- Sub-components ---

const PieceComponent: React.FC<{ piece: Piece; isSelected: boolean; isSuggested: boolean; onClick: () => void }> = ({ piece, isSelected, isSuggested, onClick }) => {
  const isRed = piece.color === Color.RED;
  const name = CHINESE_NAMES[`${piece.color}-${piece.type}`];

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`
        absolute w-[10%] h-[9%] rounded-full flex items-center justify-center cursor-pointer
        transition-all duration-200 transform z-20 select-none
        ${isSelected ? 'scale-110 z-30 shadow-[0_0_20px_rgba(250,204,21,1)] ring-4 ring-yellow-400' : 'shadow-md'}
        ${isSuggested ? 'ring-4 ring-blue-500 animate-pulse' : ''}
        ${isRed 
          ? 'bg-[#fff5f5] text-[#c53030] border-[2.5px] border-[#c53030]' 
          : 'bg-[#1a202c] text-[#f7fafc] border-[2.5px] border-[#4a5568]'}
        active:scale-95
      `}
      style={{
        left: `${(piece.position.c / 8) * 100}%`,
        top: `${(piece.position.r / 9) * 100}%`,
        transform: `translate(-50%, -50%)`,
      }}
    >
      <div className={`w-[90%] h-[90%] rounded-full border flex items-center justify-center ${isRed ? 'border-red-200/40' : 'border-gray-600/40'}`}>
        <span className="xiangqi-font text-lg sm:text-2xl font-bold leading-none">{name}</span>
      </div>
    </div>
  );
};

const BoardOverlay: React.FC = () => {
  const Marker = ({ r, c }: { r: number; c: number; key?: string }) => {
    const x = (c / 8) * 100;
    const y = (r / 9) * 100;
    const offset = 1.2;
    const len = 3.5;
    const hasLeft = c > 0;
    const hasRight = c < 8;
    return (
      <g stroke="#5d4037" strokeWidth="0.5" fill="none" opacity="0.7">
        {hasLeft && (
          <>
            <path d={`M ${x-offset} ${y-offset-len} V ${y-offset} H ${x-offset-len}`} />
            <path d={`M ${x-offset} ${y+offset+len} V ${y+offset} H ${x-offset-len}`} />
          </>
        )}
        {hasRight && (
          <>
            <path d={`M ${x+offset} ${y-offset-len} V ${y-offset} H ${x+offset+len}`} />
            <path d={`M ${x+offset} ${y+offset+len} V ${y+offset} H ${x+offset+len}`} />
          </>
        )}
      </g>
    );
  };

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" fill="none" stroke="#5d4037" strokeWidth="0.8" />
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`h-${i}`} x1="0" y1={i * (100/9)} x2="100" y2={i * (100/9)} stroke="#5d4037" strokeWidth="0.4" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <React.Fragment key={`v-${i}`}>
          <line x1={i * (100/8)} y1="0" x2={i * (100/8)} y2={4 * (100/9)} stroke="#5d4037" strokeWidth="0.4" />
          <line x1={i * (100/8)} y1={5 * (100/9)} x2={i * (100/8)} y2="100" stroke="#5d4037" strokeWidth="0.4" />
        </React.Fragment>
      ))}
      <line x1={(3/8)*100} y1="0" x2={(5/8)*100} y2={(2/9)*100} stroke="#5d4037" strokeWidth="0.4" />
      <line x1={(5/8)*100} y1="0" x2={(3/8)*100} y2={(2/9)*100} stroke="#5d4037" strokeWidth="0.4" />
      <line x1={(3/8)*100} y1={(7/9)*100} x2={(5/8)*100} y2="100" stroke="#5d4037" strokeWidth="0.4" />
      <line x1={(5/8)*100} y1={(7/9)*100} x2={(3/8)*100} y2="100" stroke="#5d4037" strokeWidth="0.4" />
      <Marker r={2} c={1} /><Marker r={2} c={7} /><Marker r={7} c={1} /><Marker r={7} c={7} />
      {[0, 2, 4, 6, 8].map(c => <Marker key={`ts-${c}`} r={3} c={c} />)}
      {[0, 2, 4, 6, 8].map(c => <Marker key={`bs-${c}`} r={6} c={c} />)}
      <text x="25" y="50" fill="#5d4037" fontSize="4" className="xiangqi-font" textAnchor="middle" dominantBaseline="middle" opacity="0.8">楚河</text>
      <text x="75" y="50" fill="#5d4037" fontSize="4" className="xiangqi-font" textAnchor="middle" dominantBaseline="middle" opacity="0.8">漢界</text>
    </svg>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'game' | 'settings' | 'online-lobby' | 'ai-difficulty'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOCAL);
  
  const [board, setBoard] = useState<BoardState>(() => {
    const b: BoardState = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    INITIAL_PIECES.forEach((p, idx) => {
      if (p.position) b[p.position.r][p.position.c] = { ...p, id: `piece-${idx}` } as Piece;
    });
    return b;
  });

  // 🔥 FIX START: Tạo Ref để giữ giá trị board mới nhất
  const boardRef = useRef(board);
  
  // 🔥 FIX: Đồng bộ board vào boardRef mỗi khi state thay đổi
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  // 🔥 FIX END

  const [turn, setTurn] = useState<Color>(Color.RED);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  const [history, setHistory] = useState<Move[]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [checkNotify, setCheckNotify] = useState<{ color: Color } | null>(null);
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('xiangqi_settings_v3');
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      volume: 1.0, 
      theme: 'classic',
      aiDifficulty: AIDifficulty.MEDIUM,
      timerLimit: 600,
      suggestionsOn: true
    };
  });
  const [online, setOnline] = useState<OnlineState>({
    roomCode: null,
    playerColor: null,
    status: 'IDLE',
    opponentName: 'Đối thủ'
  });
  const [timers, setTimers] = useState<{ [Color.RED]: number; [Color.BLACK]: number }>({
    [Color.RED]: settings.timerLimit,
    [Color.BLACK]: settings.timerLimit
  });

  const [suggestedMove, setSuggestedMove] = useState<any | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const timerIntervalRef = useRef<number | null>(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('xiangqi_settings_v3', JSON.stringify(settings));
  }, [settings]);

  // --- Check Notification Hiding ---
  useEffect(() => {
    if (checkNotify) {
      const t = setTimeout(() => setCheckNotify(null), 1500);
      return () => clearTimeout(t);
    }
  }, [checkNotify]);

  // --- Game Initialization ---
  const initGame = useCallback((forceColor?: Color) => {
    const b: BoardState = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    INITIAL_PIECES.forEach((p, idx) => {
      if (p.position) b[p.position.r][p.position.c] = { ...p, id: `piece-${Date.now()}-${idx}` } as Piece;
    });
    setBoard(b);
    setTurn(Color.RED);
    setSelectedPiece(null);
    setValidMoves([]);
    setHistory([]);
    setGameOver(null);
    setCheckNotify(null);
    setSuggestedMove(null);
    setTimers({ [Color.RED]: settings.timerLimit, [Color.BLACK]: settings.timerLimit });
    if (forceColor) setOnline(prev => ({ ...prev, playerColor: forceColor, status: 'WAITING' }));
  }, [settings.timerLimit]);

 // --- Online Sync Logic ---
useEffect(() => {
  if (gameMode !== GameMode.ONLINE) return;
  if (!online.roomCode) return;

  const join = () => {
    socket.emit("joinRoom", online.roomCode);
  };

  socket.on("connect", join);

  socket.on("room-update", (size) => {
    console.log("ROOM SIZE:", size);

    if (size === 2) {
      setOnline(prev => ({
        ...prev,
        status: "CONNECTED"
      }));
    }
  });

  socket.on("opponent-move", ({ from, to, by }) => {
    remoteHandleMove(from, to, by);
  });

  if (!socket.connected) {
    socket.connect();
  } else {
    join();
  }

  return () => {
    socket.off("connect", join);
    socket.off("room-update");
    socket.off("opponent-move");
  };

}, [gameMode, online.roomCode]);
  const createRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOnline({ roomCode: code, playerColor: Color.RED, status: 'WAITING', opponentName: 'Đang đợi...' });
    setGameMode(GameMode.ONLINE);
    initGame(Color.RED);
    setScreen('game');
  };

  const joinRoom = () => {
    if (joinCode.length !== 4) return;
    setOnline({ roomCode: joinCode, playerColor: Color.BLACK, status: 'CONNECTED', opponentName: 'Chủ phòng' });
    setGameMode(GameMode.ONLINE);
    initGame(Color.BLACK);
    setScreen('game');
  };

  // --- Move Handlers ---
  const handleMove = (from: { r: number, c: number }, to: { r: number, c: number }) => {
    if (gameOver) return;

    // Chặn nếu không phải lượt mình
    if (
      gameMode === GameMode.ONLINE &&
      turn !== online.playerColor
    ) return;

    const piece = board[from.r][from.c];
    if (!piece) return;

    const target = board[to.r][to.c];

    const newBoard = board.map(row => row.slice());
    newBoard[to.r][to.c] = { ...piece, position: to };
    newBoard[from.r][from.c] = null;

    setBoard(newBoard);
    setHistory(prev => [...prev, { from, to, captured: target || undefined }]);

    const nextColor = piece.color === Color.RED ? Color.BLACK : Color.RED;
    setTurn(nextColor);

    // CHỈ emit
    if (gameMode === GameMode.ONLINE) {
      socket.emit("move", {
        roomId: online.roomCode,
        from,
        to,
        by: piece.color 
      });
    }

    setSelectedPiece(null);
    setValidMoves([]);
  };

  const remoteHandleMove = (
    from: { r: number; c: number },
    to: { r: number; c: number },
    by: Color
  ) => {
    if (by === online.playerColor) return;

    // 🔥 FIX: Dùng boardRef.current thay vì board để lấy trạng thái mới nhất
    const currentBoard = boardRef.current;
    
    const piece = currentBoard[from.r][from.c];
    if (!piece) return;

    const target = currentBoard[to.r][to.c];

    if (settings.soundEnabled) {
      target
        ? AudioService.playCaptureSound(settings.volume)
        : AudioService.playMoveSound(settings.volume);
    }

    // Cập nhật từ currentBoard
    const newBoard = currentBoard.map(row => row.slice());
    newBoard[to.r][to.c] = { ...piece, position: to };
    newBoard[from.r][from.c] = null;

    const nextColor = piece.color === Color.RED ? Color.BLACK : Color.RED;

    setBoard(newBoard); // Update state, boardRef sẽ tự update nhờ useEffect
    
    setHistory(prev => [
      ...prev,
      { from, to, captured: target || undefined, notation: 'Opponent' }
    ]);

    if (XiangqiRules.isInCheck(nextColor, newBoard)) {
      setCheckNotify({ color: nextColor });
    }

    if (XiangqiRules.isCheckmate(nextColor, newBoard)) {
      setGameOver(
        `Chiếu bí! ${piece.color === Color.RED ? 'Bên Đỏ' : 'Bên Đen'} thắng.`
      );
    }

    setTurn(nextColor);
    setSelectedPiece(null);
    setValidMoves([]);
    setSuggestedMove(null);
  };

  const onSquareClick = (r: number, c: number) => {
    if (gameOver) return;

    if (
      gameMode === GameMode.ONLINE &&
      turn !== online.playerColor
    ) return;

    if (selectedPiece) {
      const isMoveValid = validMoves.some(m => m.r === r && m.c === c);
      if (isMoveValid) {
        handleMove(selectedPiece.position, { r, c });
      } else {
        const target = board[r][c];
        if (target && target.color === turn) {
          setSelectedPiece(target);
          setValidMoves(XiangqiRules.getValidMoves(target, board));
        } else {
          setSelectedPiece(null);
          setValidMoves([]);
        }
      }
    } else {
      const target = board[r][c];
      if (target && target.color === turn) {
        setSelectedPiece(target);
        setValidMoves(XiangqiRules.getValidMoves(target, board));
      }
    }
  };

  // --- AI Effect ---
  useEffect(() => {
    if (gameMode === GameMode.AI && turn === Color.BLACK && !gameOver) {
      const timer = setTimeout(() => {
        const bestMove = AIEngine.getBestMove(board, Color.BLACK, settings.aiDifficulty);
        if (bestMove) handleMove(bestMove.from, bestMove.to);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, gameOver, board, settings.aiDifficulty]);

  // --- Timer Effect ---
  useEffect(() => {
    if (gameOver || screen !== 'game' || settings.timerLimit === 0) return;
    timerIntervalRef.current = window.setInterval(() => {
      setTimers(prev => {
        const newVal = prev[turn] - 1;
        if (newVal <= 0) {
          setGameOver(`Hết giờ! ${turn === Color.RED ? 'Bên Đen' : 'Bên Đỏ'} thắng.`);
          return prev;
        }
        return { ...prev, [turn]: newVal };
      });
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [turn, gameOver, screen, settings.timerLimit]);

  const undo = () => {
    if (history.length === 0 || gameMode === GameMode.ONLINE || !!gameOver) return;
    const lastMove = history[history.length - 1];
    const newBoard = board.map(row => row.slice());
    const piece = newBoard[lastMove.to.r][lastMove.to.c]!;
    newBoard[lastMove.from.r][lastMove.from.c] = { ...piece, position: lastMove.from };
    newBoard[lastMove.to.r][lastMove.to.c] = lastMove.captured || null;
    setBoard(newBoard);
    setHistory(prev => prev.slice(0, -1));
    setTurn(turn === Color.RED ? Color.BLACK : Color.RED);
    setSelectedPiece(null);
    setValidMoves([]);
    setSuggestedMove(null);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  };

  // --- Screens ---

  if (screen === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdf2f2] p-8">
        <div className="text-center mb-12">
          <h1 className="text-8xl sm:text-9xl xiangqi-font text-[#991b1b] drop-shadow-xl animate-pulse">象棋</h1>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-700 tracking-[0.4em] mt-4 uppercase">Xiangqi Master</h2>
        </div>
        <div className="flex flex-col gap-5 w-full max-w-sm">
          <button onClick={() => { setGameMode(GameMode.LOCAL); setScreen('game'); initGame(); }} className="w-full bg-[#991b1b] text-white py-5 rounded-2xl shadow-xl hover:bg-[#7f1d1d] active:scale-95 transition-all font-black text-lg">SONG ĐẤU</button>
          <button onClick={() => setScreen('online-lobby')} className="w-full bg-blue-600 text-white py-5 rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all font-black text-lg">CHƠI TRỰC TUYẾN</button>
          <button onClick={() => setScreen('ai-difficulty')} className="w-full bg-gray-800 text-white py-5 rounded-2xl shadow-xl hover:bg-black active:scale-95 transition-all font-black text-lg">ĐẤU VỚI MÁY (AI)</button>
          <button onClick={() => setScreen('settings')} className="w-full bg-white text-gray-800 border-2 border-gray-200 py-4 rounded-2xl hover:bg-gray-50 active:scale-95 font-bold shadow-md transition-all">CÀI ĐẶT</button>
        </div>
      </div>
    );
  }

  if (screen === 'ai-difficulty') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdf2f2] p-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-[#991b1b] uppercase">Chọn độ khó AI</h2>
        </div>
        <div className="flex flex-col gap-5 w-full max-w-sm">
          <button onClick={() => { setSettings({...settings, aiDifficulty: AIDifficulty.EASY}); setGameMode(GameMode.AI); setScreen('game'); initGame(); }} className="w-full bg-green-600 text-white py-5 rounded-2xl shadow-lg font-black text-lg">Dễ</button>
          <button onClick={() => { setSettings({...settings, aiDifficulty: AIDifficulty.MEDIUM}); setGameMode(GameMode.AI); setScreen('game'); initGame(); }} className="w-full bg-yellow-600 text-white py-5 rounded-2xl shadow-lg font-black text-lg">Vừa</button>
          <button onClick={() => { setSettings({...settings, aiDifficulty: AIDifficulty.HARD}); setGameMode(GameMode.AI); setScreen('game'); initGame(); }} className="w-full bg-red-600 text-white py-5 rounded-2xl shadow-lg font-black text-lg">Khó</button>
          <button onClick={() => setScreen('menu')} className="mt-4 text-gray-500 font-bold uppercase text-sm">Quay lại</button>
        </div>
      </div>
    );
  }

  if (screen === 'online-lobby') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-8">
          <h2 className="text-3xl font-black text-[#991b1b] text-center uppercase">Chơi Trực Tuyến</h2>
          <button onClick={createRoom} className="w-full bg-[#991b1b] text-white py-5 rounded-2xl font-black shadow-lg">TẠO PHÒNG MỚI</button>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Mã phòng" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              className="w-full p-4 border-2 rounded-2xl text-center text-2xl font-black tracking-widest"
            />
            <button disabled={joinCode.length !== 4} onClick={joinRoom} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg disabled:opacity-30">VÀO PHÒNG</button>
          </div>
          <button onClick={() => setScreen('menu')} className="w-full text-gray-400 font-bold">Quay lại</button>
        </div>
      </div>
    );
  }

  if (screen === 'settings') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border">
          <div className="bg-[#991b1b] p-8 text-white flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase">Cài Đặt</h2>
            <button onClick={() => setScreen('menu')} className="text-2xl">✕</button>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold">Âm thanh</span>
              <button onClick={() => setSettings({...settings, soundEnabled: !settings.soundEnabled})} className={`w-14 h-8 rounded-full relative transition-all ${settings.soundEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.soundEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-black text-gray-400 uppercase">Âm lượng</p>
              <input type="range" min="0" max="2" step="0.1" value={settings.volume} onChange={(e) => setSettings({...settings, volume: parseFloat(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-[#991b1b]" />
            </div>
            <button onClick={() => setScreen('menu')} className="w-full bg-[#991b1b] text-white py-4 rounded-xl font-bold shadow-lg">LƯU</button>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = gameMode !== GameMode.ONLINE || turn === online.playerColor;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-4">
      {/* Player Indicators */}
      <div className="w-full max-w-[500px] flex justify-between items-center mb-6">
        <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${turn === Color.BLACK ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 opacity-60'}`}>
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold">B</div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-60">Đối thủ</p>
            <p className="text-sm font-black">{settings.timerLimit > 0 ? formatTime(timers[Color.BLACK]) : '∞'}</p>
          </div>
        </div>
        
        {gameMode === GameMode.ONLINE && (
          <div className="flex flex-col items-center">
            <div className="px-4 py-1 rounded-full text-[10px] font-black uppercase bg-white shadow-sm">
              PHÒNG: <span className="text-blue-600">{online.roomCode}</span>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all flex-row-reverse ${turn === Color.RED ? 'bg-[#991b1b] text-white shadow-xl scale-105' : 'bg-white text-gray-400 opacity-60'}`}>
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold">R</div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-60">Bạn</p>
            <p className="text-sm font-black">{settings.timerLimit > 0 ? formatTime(timers[Color.RED]) : '∞'}</p>
          </div>
        </div>
      </div>

      {/* Board Container */}
      <div className="relative w-full max-w-[500px] aspect-[9/10] bg-[#e5c07b] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] rounded-xl shadow-2xl border-[10px] border-[#5d4037] p-[4%] select-none flex items-center justify-center mx-auto">
        <div className="relative w-full h-full">
          <BoardOverlay />
          {Array.from({ length: BOARD_ROWS }).map((_, r) => 
            Array.from({ length: BOARD_COLS }).map((_, c) => (
              <div 
                key={`${r}-${c}`} 
                onClick={() => onSquareClick(r, c)} 
                className="absolute w-[11.11%] h-[10%] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 flex items-center justify-center" 
                style={{ left: `${(c / 8) * 100}%`, top: `${(r / 9) * 100}%` }}
              >
                {validMoves.some(m => m.r === r && m.c === c) && (
                  <div className="w-4 h-4 bg-green-500/50 rounded-full border-2 border-green-700 shadow-sm"></div>
                )}
              </div>
            ))
          )}
          {board.map((row) => row.map((piece) => piece && (
            <PieceComponent 
              key={piece.id} 
              piece={piece} 
              isSelected={selectedPiece?.id === piece.id} 
              isSuggested={suggestedMove?.from.r === piece.position.r && suggestedMove?.from.c === piece.position.c}
              onClick={() => onSquareClick(piece.position.r, piece.position.c)} 
            />
          )))}

          {/* Check Notification Overlay */}
          {checkNotify && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
               <div className={`px-10 py-4 rounded-xl shadow-2xl border-4 animate-bounce transition-all ${checkNotify.color === Color.RED ? 'bg-red-700 text-white border-red-500' : 'bg-gray-900 text-white border-gray-600'}`}>
                  <span className="text-3xl font-black uppercase tracking-widest drop-shadow-lg">CHIẾU TƯỚNG!</span>
               </div>
            </div>
          )}
        </div>

        {(!isMyTurn && !gameOver) && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-40 pointer-events-none">
            <div className="bg-gray-800/90 text-white px-8 py-3 rounded-full font-black text-sm uppercase shadow-2xl animate-pulse">
              Đợi đối thủ...
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg text-center p-8">
            <h2 className="text-3xl text-yellow-400 font-black mb-8 drop-shadow-lg">{gameOver}</h2>
            <button onClick={() => { setScreen('menu'); initGame(); }} className="bg-red-700 text-white px-10 py-4 rounded-full font-black shadow-xl">MENU</button>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="w-full max-w-[500px] mt-8 grid grid-cols-2 gap-4 px-2">
        <button onClick={() => setScreen('menu')} className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl shadow-sm border hover:bg-gray-50 active:scale-90 transition-all group">
          <span className="text-3xl">🏠</span>
          <span className="text-[10px] font-black text-gray-500 uppercase">Trang chủ</span>
        </button>
        <button onClick={undo} disabled={history.length === 0 || gameMode === GameMode.ONLINE || !!gameOver} className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl shadow-sm border transition-all active:scale-90 disabled:opacity-30">
          <span className="text-3xl">↺</span>
          <span className="text-[10px] font-black text-gray-500 uppercase">Hoàn nước</span>
        </button>
      </div>

      {/* Turn Banner */}
      <div className="w-full max-w-[500px] mt-6 px-2">
        <div className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 shadow-lg border-b-4 transition-all ${turn === Color.RED ? 'bg-red-700 border-red-900' : 'bg-gray-900 border-black'}`}>
           <span className="text-white font-black uppercase tracking-widest text-lg">
             ĐẾN LƯỢT: {turn === Color.RED ? 'BÊN ĐỎ' : 'BÊN ĐEN'}
           </span>
        </div>
      </div>
    </div>
  );
};

export default App;