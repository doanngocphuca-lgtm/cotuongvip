
import { Color, PieceType, Piece, BoardState, Move, AIDifficulty } from '../types';
import { PIECE_VALUES } from '../constants';
import { XiangqiRules } from './XiangqiRules';

export class AIEngine {
  static getBestMove(board: BoardState, color: Color, difficulty: AIDifficulty): Move | null {
    const allMoves = this.getAllValidMoves(board, color);
    if (allMoves.length === 0) return null;

    switch (difficulty) {
      case AIDifficulty.EASY:
        return allMoves[Math.floor(Math.random() * allMoves.length)];

      case AIDifficulty.MEDIUM:
        return this.getMediumMove(allMoves, board);

      case AIDifficulty.HARD:
        return this.getMinimaxMove(board, color, 3);
      
      default:
        return allMoves[0];
    }
  }

  private static getAllValidMoves(board: BoardState, color: Color): Move[] {
    const moves: Move[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const valid = XiangqiRules.getValidMoves(p, board);
          valid.forEach(v => {
            moves.push({
              from: p.position,
              to: v,
              captured: board[v.r][v.c] || undefined,
              notation: `${p.type} to ${v.r},${v.c}`
            });
          });
        }
      }
    }
    return moves;
  }

  private static getMediumMove(moves: Move[], board: BoardState): Move {
    // Prefer moves that capture high value pieces
    return moves.sort((a, b) => {
      const valA = a.captured ? PIECE_VALUES[a.captured.type] : 0;
      const valB = b.captured ? PIECE_VALUES[b.captured.type] : 0;
      return valB - valA;
    })[0];
  }

  private static evaluateBoard(board: BoardState, aiColor: Color): number {
    let score = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p) {
          const val = PIECE_VALUES[p.type];
          score += (p.color === aiColor ? val : -val);
        }
      }
    }
    return score;
  }

  private static getMinimaxMove(board: BoardState, color: Color, depth: number): Move | null {
    let bestScore = -Infinity;
    let bestMove: Move | null = null;
    const moves = this.getAllValidMoves(board, color);

    for (const move of moves) {
      const newBoard = board.map(row => row.slice());
      const p = newBoard[move.from.r][move.from.c]!;
      newBoard[move.to.r][move.to.c] = { ...p, position: move.to };
      newBoard[move.from.r][move.from.c] = null;

      const score = this.minimax(newBoard, depth - 1, false, color, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  private static minimax(board: BoardState, depth: number, isMaximizing: boolean, aiColor: Color, alpha: number, beta: number): number {
    if (depth === 0) {
      return this.evaluateBoard(board, aiColor);
    }

    const currColor = isMaximizing ? aiColor : (aiColor === Color.RED ? Color.BLACK : Color.RED);
    const moves = this.getAllValidMoves(board, currColor);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newBoard = board.map(row => row.slice());
        const p = newBoard[move.from.r][move.from.c]!;
        newBoard[move.to.r][move.to.c] = { ...p, position: move.to };
        newBoard[move.from.r][move.from.c] = null;

        const evaluation = this.minimax(newBoard, depth - 1, false, aiColor, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newBoard = board.map(row => row.slice());
        const p = newBoard[move.from.r][move.from.c]!;
        newBoard[move.to.r][move.to.c] = { ...p, position: move.to };
        newBoard[move.from.r][move.from.c] = null;

        const evaluation = this.minimax(newBoard, depth - 1, true, aiColor, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
