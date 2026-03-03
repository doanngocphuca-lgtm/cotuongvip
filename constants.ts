
import { PieceType, Color, Piece } from './types';

export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.GENERAL]: 10000,
  [PieceType.ROOK]: 90,
  [PieceType.CANNON]: 45,
  [PieceType.HORSE]: 40,
  [PieceType.ELEPHANT]: 20,
  [PieceType.ADVISOR]: 20,
  [PieceType.SOLDIER]: 10
};

export const INITIAL_PIECES: Partial<Piece>[] = [
  // Black pieces (Top)
  { type: PieceType.ROOK, color: Color.BLACK, position: { r: 0, c: 0 } },
  { type: PieceType.HORSE, color: Color.BLACK, position: { r: 0, c: 1 } },
  { type: PieceType.ELEPHANT, color: Color.BLACK, position: { r: 0, c: 2 } },
  { type: PieceType.ADVISOR, color: Color.BLACK, position: { r: 0, c: 3 } },
  { type: PieceType.GENERAL, color: Color.BLACK, position: { r: 0, c: 4 } },
  { type: PieceType.ADVISOR, color: Color.BLACK, position: { r: 0, c: 5 } },
  { type: PieceType.ELEPHANT, color: Color.BLACK, position: { r: 0, c: 6 } },
  { type: PieceType.HORSE, color: Color.BLACK, position: { r: 0, c: 7 } },
  { type: PieceType.ROOK, color: Color.BLACK, position: { r: 0, c: 8 } },
  { type: PieceType.CANNON, color: Color.BLACK, position: { r: 2, c: 1 } },
  { type: PieceType.CANNON, color: Color.BLACK, position: { r: 2, c: 7 } },
  { type: PieceType.SOLDIER, color: Color.BLACK, position: { r: 3, c: 0 } },
  { type: PieceType.SOLDIER, color: Color.BLACK, position: { r: 3, c: 2 } },
  { type: PieceType.SOLDIER, color: Color.BLACK, position: { r: 3, c: 4 } },
  { type: PieceType.SOLDIER, color: Color.BLACK, position: { r: 3, c: 6 } },
  { type: PieceType.SOLDIER, color: Color.BLACK, position: { r: 3, c: 8 } },

  // Red pieces (Bottom)
  { type: PieceType.ROOK, color: Color.RED, position: { r: 9, c: 0 } },
  { type: PieceType.HORSE, color: Color.RED, position: { r: 9, c: 1 } },
  { type: PieceType.ELEPHANT, color: Color.RED, position: { r: 9, c: 2 } },
  { type: PieceType.ADVISOR, color: Color.RED, position: { r: 9, c: 3 } },
  { type: PieceType.GENERAL, color: Color.RED, position: { r: 9, c: 4 } },
  { type: PieceType.ADVISOR, color: Color.RED, position: { r: 9, c: 5 } },
  { type: PieceType.ELEPHANT, color: Color.RED, position: { r: 9, c: 6 } },
  { type: PieceType.HORSE, color: Color.RED, position: { r: 9, c: 7 } },
  { type: PieceType.ROOK, color: Color.RED, position: { r: 9, c: 8 } },
  { type: PieceType.CANNON, color: Color.RED, position: { r: 7, c: 1 } },
  { type: PieceType.CANNON, color: Color.RED, position: { r: 7, c: 7 } },
  { type: PieceType.SOLDIER, color: Color.RED, position: { r: 6, c: 0 } },
  { type: PieceType.SOLDIER, color: Color.RED, position: { r: 6, c: 2 } },
  { type: PieceType.SOLDIER, color: Color.RED, position: { r: 6, c: 4 } },
  { type: PieceType.SOLDIER, color: Color.RED, position: { r: 6, c: 6 } },
  { type: PieceType.SOLDIER, color: Color.RED, position: { r: 6, c: 8 } },
];

export const CHINESE_NAMES: Record<string, string> = {
  'BLACK-GENERAL': '將',
  'BLACK-ADVISOR': '士',
  'BLACK-ELEPHANT': '象',
  'BLACK-HORSE': '馬',
  'BLACK-ROOK': '車',
  'BLACK-CANNON': '砲',
  'BLACK-SOLDIER': '卒',
  'RED-GENERAL': '帥',
  'RED-ADVISOR': '仕',
  'RED-ELEPHANT': '相',
  'RED-HORSE': '傌',
  'RED-ROOK': '俥',
  'RED-CANNON': '炮',
  'RED-SOLDIER': '兵'
};
