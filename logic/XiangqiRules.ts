
import { Color, PieceType, Piece, BoardState, Move } from '../types';
import { BOARD_ROWS, BOARD_COLS } from '../constants';

export class XiangqiRules {
  static createInitialBoard(): BoardState {
    const board: BoardState = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    // Implementation of initial setup is handled in store/game logic
    return board;
  }

  static getValidMoves(piece: Piece, board: BoardState, skipCheckValidation: boolean = false): { r: number; c: number }[] {
    const moves: { r: number; c: number }[] = [];
    const { r, c } = piece.position;

    const addMoveIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) return false;
      const target = board[nr][nc];
      if (!target || target.color !== piece.color) {
        if (skipCheckValidation) {
          moves.push({ r: nr, c: nc });
        } else {
          // Check if this move results in the player's general being in check
          if (!this.resultsInCheck(piece, { r: nr, c: nc }, board)) {
            moves.push({ r: nr, c: nc });
          }
        }
        return !target; // Return true if empty square (for pieces that slide)
      }
      return false;
    };

    switch (piece.type) {
      case PieceType.GENERAL: {
        const palaceRows = piece.color === Color.RED ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];
        [[r+1, c], [r-1, c], [r, c+1], [r, c-1]].forEach(([nr, nc]) => {
          if (palaceRows.includes(nr) && palaceCols.includes(nc)) {
            addMoveIfValid(nr, nc);
          }
        });
        // Special rule: Flying General (General cannot face each other directly)
        // This is handled via check validation usually, but we can prevent it here too
        break;
      }

      case PieceType.ADVISOR: {
        const palaceRows = piece.color === Color.RED ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];
        [[r+1, c+1], [r+1, c-1], [r-1, c+1], [r-1, c-1]].forEach(([nr, nc]) => {
          if (palaceRows.includes(nr) && palaceCols.includes(nc)) {
            addMoveIfValid(nr, nc);
          }
        });
        break;
      }

      case PieceType.ELEPHANT: {
        const isRed = piece.color === Color.RED;
        const validRows = isRed ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
        const directions = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        directions.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          const eyeR = r + dr / 2;
          const eyeC = c + dc / 2;
          if (validRows.includes(nr) && nc >= 0 && nc < BOARD_COLS) {
            if (!board[eyeR][eyeC]) { // Elephant eye must be empty
              addMoveIfValid(nr, nc);
            }
          }
        });
        break;
      }

      case PieceType.HORSE: {
        const jumps = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
        jumps.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          // Blocked horse leg
          const legR = Math.abs(dr) === 2 ? r + dr / 2 : r;
          const legC = Math.abs(dc) === 2 ? c + dc / 2 : c;
          if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
            if (!board[legR][legC]) {
              addMoveIfValid(nr, nc);
            }
          }
        });
        break;
      }

      case PieceType.ROOK: {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        dirs.forEach(([dr, dc]) => {
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
            const target = board[nr][nc];
            if (!target) {
              addMoveIfValid(nr, nc);
            } else {
              if (target.color !== piece.color) {
                addMoveIfValid(nr, nc);
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        });
        break;
      }

      case PieceType.CANNON: {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        dirs.forEach(([dr, dc]) => {
          let nr = r + dr;
          let nc = c + dc;
          let foundMount = false;
          while (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
            const target = board[nr][nc];
            if (!foundMount) {
              if (!target) {
                addMoveIfValid(nr, nc);
              } else {
                foundMount = true;
              }
            } else {
              if (target) {
                if (target.color !== piece.color) {
                  addMoveIfValid(nr, nc);
                }
                break;
              }
            }
            nr += dr;
            nc += dc;
          }
        });
        break;
      }

      case PieceType.SOLDIER: {
        const isRed = piece.color === Color.RED;
        const dir = isRed ? -1 : 1;
        const crossRiver = isRed ? r < 5 : r > 4;
        
        // Always forward
        addMoveIfValid(r + dir, c);
        
        // Side moves if across river
        if (crossRiver) {
          addMoveIfValid(r, c - 1);
          addMoveIfValid(r, c + 1);
        }
        break;
      }
    }
    return moves;
  }

  static findGeneral(color: Color, board: BoardState): { r: number; c: number } | null {
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = board[r][c];
        if (p && p.type === PieceType.GENERAL && p.color === color) {
          return { r, c };
        }
      }
    }
    return null;
  }

  static isInCheck(color: Color, board: BoardState): boolean {
    const generalPos = this.findGeneral(color, board);
    if (!generalPos) return false;

    // Check if any piece of the opposite color can attack the general
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = board[r][c];
        if (p && p.color !== color) {
          // We use skipCheckValidation to avoid infinite recursion
          const moves = this.getValidMoves(p, board, true);
          if (moves.some(m => m.r === generalPos.r && m.c === generalPos.c)) {
            return true;
          }
        }
      }
    }

    // Flying general rule
    const otherColor = color === Color.RED ? Color.BLACK : Color.RED;
    const otherGeneralPos = this.findGeneral(otherColor, board);
    if (otherGeneralPos && generalPos.c === otherGeneralPos.c) {
      let blocked = false;
      const startR = Math.min(generalPos.r, otherGeneralPos.r);
      const endR = Math.max(generalPos.r, otherGeneralPos.r);
      for (let r = startR + 1; r < endR; r++) {
        if (board[r][generalPos.c]) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return true;
    }

    return false;
  }

  static resultsInCheck(piece: Piece, target: { r: number; c: number }, board: BoardState): boolean {
    // Clone board to simulate move
    const newBoard = board.map(row => row.slice());
    newBoard[target.r][target.c] = { ...piece, position: target };
    newBoard[piece.position.r][piece.position.c] = null;
    return this.isInCheck(piece.color, newBoard);
  }

  static isCheckmate(color: Color, board: BoardState): boolean {
    if (!this.isInCheck(color, board)) return false;

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const validMoves = this.getValidMoves(p, board);
          if (validMoves.length > 0) return false;
        }
      }
    }
    return true;
  }

  static isDraw(color: Color, board: BoardState): boolean {
    // Basic draw detection: current player has no moves but is not in check
    if (this.isInCheck(color, board)) return false;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const validMoves = this.getValidMoves(p, board);
          if (validMoves.length > 0) return false;
        }
      }
    }
    return true;
  }
}
