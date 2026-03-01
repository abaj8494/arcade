/**
 * Chess AI Web Worker
 * Iterative deepening minimax with alpha-beta pruning and time control.
 * Receives: { board, castlingRights, enPassantSquare, aiIsWhite, timeLimitMs, moveCount }
 * Posts:    { bestMove, depth, score, timeMs }
 */

/* eslint-disable no-restricted-globals */

// Piece constants (must mirror Chess.js)
const EMPTY = 0;
const wP = 1, wN = 2, wB = 3, wR = 4, wQ = 5, wK = 6;
const bP = 7, bN = 8, bB = 9, bR = 10, bQ = 11, bK = 12;

const isWhite = (p) => p >= 1 && p <= 6;
const isBlack = (p) => p >= 7 && p <= 12;
const isPawn = (p) => p === wP || p === bP;
const isKnight = (p) => p === wN || p === bN;
const isBishop = (p) => p === wB || p === bB;
const isRook = (p) => p === wR || p === bR;
const isQueen = (p) => p === wQ || p === bQ;
const isKing = (p) => p === wK || p === bK;

// Piece values
const PIECE_VALUES = {
  [wP]: 100, [wN]: 320, [wB]: 330, [wR]: 500, [wQ]: 900, [wK]: 20000,
  [bP]: 100, [bN]: 320, [bB]: 330, [bR]: 500, [bQ]: 900, [bK]: 20000,
};

// Piece-square tables for positional evaluation (from white's perspective)
const PST_PAWN = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const PST_KING_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const PST_KING_END = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

function getPST(piece, row, col, isEndgame) {
  // For black pieces, mirror the row
  const r = isWhite(piece) ? row : 7 - row;
  const idx = r * 8 + col;

  if (isPawn(piece)) return PST_PAWN[idx];
  if (isKnight(piece)) return PST_KNIGHT[idx];
  if (isBishop(piece)) return PST_BISHOP[idx];
  if (isRook(piece)) return PST_ROOK[idx];
  if (isQueen(piece)) return PST_QUEEN[idx];
  if (isKing(piece)) return isEndgame ? PST_KING_END[idx] : PST_KING_MID[idx];
  return 0;
}

// Find king position
function findKing(board, isWhiteKing) {
  const king = isWhiteKing ? wK : bK;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return [r, c];
    }
  }
  return null;
}

// Check if a square is attacked
function isSquareAttacked(board, row, col, byWhite) {
  const pawnDir = byWhite ? 1 : -1;
  const pawn = byWhite ? wP : bP;
  if (row + pawnDir >= 0 && row + pawnDir < 8) {
    if (col > 0 && board[row + pawnDir][col - 1] === pawn) return true;
    if (col < 7 && board[row + pawnDir][col + 1] === pawn) return true;
  }

  const knight = byWhite ? wN : bN;
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === knight) return true;
  }

  const king = byWhite ? wK : bK;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === king) return true;
    }
  }

  const directions = [
    [-1,0],[1,0],[0,-1],[0,1],
    [-1,-1],[-1,1],[1,-1],[1,1]
  ];
  const rook = byWhite ? wR : bR;
  const bishop = byWhite ? wB : bB;
  const queen = byWhite ? wQ : bQ;

  for (let i = 0; i < directions.length; i++) {
    const [dr, dc] = directions[i];
    let nr = row + dr, nc = col + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const piece = board[nr][nc];
      if (piece !== 0) {
        if (i < 4) {
          if (piece === rook || piece === queen) return true;
        } else {
          if (piece === bishop || piece === queen) return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

function isInCheck(board, isWhiteTurn) {
  const kingPos = findKing(board, isWhiteTurn);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos[0], kingPos[1], !isWhiteTurn);
}

// Generate pseudo-legal moves
function getPseudoLegalMoves(board, row, col, castling, enPassant) {
  const piece = board[row][col];
  if (piece === 0) return [];
  const moves = [];
  const white = isWhite(piece);

  if (isPawn(piece)) {
    const dir = white ? -1 : 1;
    const startRow = white ? 6 : 1;
    if (board[row + dir]?.[col] === 0) {
      moves.push([row + dir, col]);
      if (row === startRow && board[row + 2 * dir]?.[col] === 0) {
        moves.push([row + 2 * dir, col]);
      }
    }
    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (nc >= 0 && nc < 8) {
        const target = board[row + dir]?.[nc];
        if (target && (white ? isBlack(target) : isWhite(target))) {
          moves.push([row + dir, nc]);
        }
        if (enPassant && enPassant[0] === row + dir && enPassant[1] === nc) {
          moves.push([row + dir, nc, 'ep']);
        }
      }
    }
  } else if (isKnight(piece)) {
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightMoves) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target === 0 || (white ? isBlack(target) : isWhite(target))) {
          moves.push([nr, nc]);
        }
      }
    }
  } else if (isKing(piece)) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (target === 0 || (white ? isBlack(target) : isWhite(target))) {
            moves.push([nr, nc]);
          }
        }
      }
    }
    // Castling
    if (white && row === 7 && col === 4) {
      if (castling.wK && board[7][5] === 0 && board[7][6] === 0 && board[7][7] === wR) {
        if (!isSquareAttacked(board, 7, 4, false) && !isSquareAttacked(board, 7, 5, false) && !isSquareAttacked(board, 7, 6, false)) {
          moves.push([7, 6, 'castle']);
        }
      }
      if (castling.wQ && board[7][3] === 0 && board[7][2] === 0 && board[7][1] === 0 && board[7][0] === wR) {
        if (!isSquareAttacked(board, 7, 4, false) && !isSquareAttacked(board, 7, 3, false) && !isSquareAttacked(board, 7, 2, false)) {
          moves.push([7, 2, 'castle']);
        }
      }
    } else if (!white && row === 0 && col === 4) {
      if (castling.bK && board[0][5] === 0 && board[0][6] === 0 && board[0][7] === bR) {
        if (!isSquareAttacked(board, 0, 4, true) && !isSquareAttacked(board, 0, 5, true) && !isSquareAttacked(board, 0, 6, true)) {
          moves.push([0, 6, 'castle']);
        }
      }
      if (castling.bQ && board[0][3] === 0 && board[0][2] === 0 && board[0][1] === 0 && board[0][0] === bR) {
        if (!isSquareAttacked(board, 0, 4, true) && !isSquareAttacked(board, 0, 3, true) && !isSquareAttacked(board, 0, 2, true)) {
          moves.push([0, 2, 'castle']);
        }
      }
    }
  } else {
    const directions = [];
    if (isRook(piece) || isQueen(piece)) directions.push([-1,0],[1,0],[0,-1],[0,1]);
    if (isBishop(piece) || isQueen(piece)) directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
    for (const [dr, dc] of directions) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target === 0) {
          moves.push([nr, nc]);
        } else {
          if (white ? isBlack(target) : isWhite(target)) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

function getLegalMoves(board, row, col, castling, enPassant) {
  const piece = board[row][col];
  if (piece === 0) return [];
  const white = isWhite(piece);
  const pseudoMoves = getPseudoLegalMoves(board, row, col, castling, enPassant);

  return pseudoMoves.filter(move => {
    const [nr, nc, special] = move;
    const newBoard = board.map(r => [...r]);
    newBoard[nr][nc] = piece;
    newBoard[row][col] = 0;
    if (special === 'ep') newBoard[row][nc] = 0;
    if (special === 'castle') {
      if (nc === 6) { newBoard[nr][5] = newBoard[nr][7]; newBoard[nr][7] = 0; }
      else { newBoard[nr][3] = newBoard[nr][0]; newBoard[nr][0] = 0; }
    }
    return !isInCheck(newBoard, white);
  });
}

// Evaluate board position
function evaluateBoard(board) {
  let score = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;

  // First pass: count material for endgame detection
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && !isKing(piece)) {
        const val = PIECE_VALUES[piece] || 0;
        if (isWhite(piece)) whiteMaterial += val;
        else blackMaterial += val;
      }
    }
  }

  const isEndgame = (whiteMaterial + blackMaterial) < 2600; // ~Both sides lost queen worth of material

  // Second pass: compute score with PST
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const materialValue = PIECE_VALUES[piece] || 0;
        const positionalValue = getPST(piece, r, c, isEndgame);
        const total = materialValue + positionalValue;
        score += isWhite(piece) ? total : -total;
      }
    }
  }

  return score;
}

// Generate all legal moves for one side
function getAllMoves(board, forWhite, castling, enPassant) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && (forWhite ? isWhite(piece) : isBlack(piece))) {
        const pieceMoves = getLegalMoves(board, r, c, castling, enPassant);
        for (const m of pieceMoves) {
          moves.push({ from: [r, c], to: [m[0], m[1]], special: m[2] });
        }
      }
    }
  }
  return moves;
}

// Apply a move to get new board (returns new board)
function applyMove(board, move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  const newBoard = board.map(r => [...r]);

  // Handle pawn promotion (auto-queen for AI)
  if (isPawn(piece) && (tr === 0 || tr === 7)) {
    newBoard[tr][tc] = isWhite(piece) ? wQ : bQ;
  } else {
    newBoard[tr][tc] = piece;
  }
  newBoard[fr][fc] = 0;

  if (move.special === 'ep') newBoard[fr][tc] = 0;
  if (move.special === 'castle') {
    if (tc === 6) { newBoard[tr][5] = newBoard[tr][7]; newBoard[tr][7] = 0; }
    else { newBoard[tr][3] = newBoard[tr][0]; newBoard[tr][0] = 0; }
  }

  return newBoard;
}

// Update castling rights after a move
function updateCastling(castling, board, move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  const nc = { ...castling };

  if (isKing(piece)) {
    if (isWhite(piece)) { nc.wK = false; nc.wQ = false; }
    else { nc.bK = false; nc.bQ = false; }
  }
  if (isRook(piece)) {
    if (fr === 7 && fc === 0) nc.wQ = false;
    if (fr === 7 && fc === 7) nc.wK = false;
    if (fr === 0 && fc === 0) nc.bQ = false;
    if (fr === 0 && fc === 7) nc.bK = false;
  }
  // Captured rook
  if (tr === 7 && tc === 0) nc.wQ = false;
  if (tr === 7 && tc === 7) nc.wK = false;
  if (tr === 0 && tc === 0) nc.bQ = false;
  if (tr === 0 && tc === 7) nc.bK = false;

  return nc;
}

// MVV-LVA move ordering score
function moveOrderScore(board, move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  const target = board[tr][tc];
  let score = 0;

  // Captures: MVV-LVA
  if (target) {
    score += (PIECE_VALUES[target] || 0) * 10 - (PIECE_VALUES[piece] || 0);
  }

  // Pawn promotion
  if (isPawn(piece) && (tr === 0 || tr === 7)) {
    score += 800;
  }

  // Castling bonus
  if (move.special === 'castle') {
    score += 60;
  }

  // Center control
  if ((tc === 3 || tc === 4) && (tr === 3 || tr === 4)) {
    score += 20;
  }

  return score;
}

// Time-checked flag
let searchDeadline = 0;
let timeExpired = false;

// Minimax with alpha-beta
function minimax(board, depth, alpha, beta, isMaximizing, castling, enPassant, nodeCount) {
  nodeCount.count++;

  // Check time every 4096 nodes
  if ((nodeCount.count & 4095) === 0) {
    if (performance.now() >= searchDeadline) {
      timeExpired = true;
      return 0;
    }
  }

  if (timeExpired) return 0;

  if (depth === 0) {
    return evaluateBoard(board);
  }

  // Generate all moves
  const moves = getAllMoves(board, isMaximizing, castling, enPassant);

  // Terminal node check
  if (moves.length === 0) {
    if (isInCheck(board, isMaximizing)) {
      return isMaximizing ? -100000 + (100 - depth) : 100000 - (100 - depth);
    }
    return 0; // stalemate
  }

  // Sort moves for better pruning
  moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const newCastling = updateCastling(castling, board, move);

      // Compute en passant for next position
      let newEP = null;
      const [fr, fc] = move.from;
      const [tr] = move.to;
      const piece = board[fr][fc];
      if (isPawn(piece) && Math.abs(tr - fr) === 2) {
        newEP = [(fr + tr) / 2, fc];
      }

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, newCastling, newEP, nodeCount);
      if (timeExpired) return maxEval === -Infinity ? 0 : maxEval;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const newCastling = updateCastling(castling, board, move);

      let newEP = null;
      const [fr, fc] = move.from;
      const [tr] = move.to;
      const piece = board[fr][fc];
      if (isPawn(piece) && Math.abs(tr - fr) === 2) {
        newEP = [(fr + tr) / 2, fc];
      }

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, newCastling, newEP, nodeCount);
      if (timeExpired) return minEval === Infinity ? 0 : minEval;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Iterative deepening search
function search(board, castling, enPassant, aiIsWhite, timeLimitMs) {
  const startTime = performance.now();
  searchDeadline = startTime + timeLimitMs;
  timeExpired = false;

  const moves = getAllMoves(board, aiIsWhite, castling, enPassant);
  if (moves.length === 0) return null;
  if (moves.length === 1) return { bestMove: moves[0], depth: 0, score: 0, timeMs: 0 };

  // Sort moves initially
  moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

  let bestMove = moves[0];
  let bestScore = aiIsWhite ? -Infinity : Infinity;
  let completedDepth = 0;

  // Iterative deepening: depth 1, 2, 3, ...
  for (let depth = 1; depth <= 30; depth++) {
    timeExpired = false;
    let currentBest = null;
    let currentBestScore = aiIsWhite ? -Infinity : Infinity;
    const nodeCount = { count: 0 };

    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const newCastling = updateCastling(castling, board, move);

      let newEP = null;
      const [fr, fc] = move.from;
      const [tr] = move.to;
      const piece = board[fr][fc];
      if (isPawn(piece) && Math.abs(tr - fr) === 2) {
        newEP = [(fr + tr) / 2, fc];
      }

      const score = minimax(newBoard, depth - 1, -Infinity, Infinity, !aiIsWhite, newCastling, newEP, nodeCount);

      if (timeExpired) break;

      if (aiIsWhite) {
        // AI is white, wants to minimize (opponent maximizes from black perspective)
        // Actually: white wants the position where evaluateBoard returns highest
        // evaluateBoard returns positive for white advantage
        // When AI is white: maximize score
        if (score > currentBestScore || (score === currentBestScore && Math.random() > 0.5)) {
          currentBestScore = score;
          currentBest = move;
        }
      } else {
        // AI is black: minimize score (negative = black advantage)
        if (score < currentBestScore || (score === currentBestScore && Math.random() > 0.5)) {
          currentBestScore = score;
          currentBest = move;
        }
      }
    }

    if (timeExpired && !currentBest) {
      // Didn't finish even one move at this depth - use previous depth's result
      break;
    }

    if (currentBest) {
      bestMove = currentBest;
      bestScore = currentBestScore;
      completedDepth = depth;

      // Put best move first for next iteration (PV move ordering)
      const bestIdx = moves.indexOf(currentBest);
      if (bestIdx > 0) {
        moves.splice(bestIdx, 1);
        moves.unshift(currentBest);
      }
    }

    if (timeExpired) break;

    // If we found a checkmate, no need to search deeper
    if (Math.abs(bestScore) > 90000) break;
  }

  return {
    bestMove,
    depth: completedDepth,
    score: bestScore,
    timeMs: Math.round(performance.now() - startTime)
  };
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { board, castlingRights, enPassantSquare, aiIsWhite, timeLimitMs } = e.data;
  const result = search(board, castlingRights, enPassantSquare, aiIsWhite, timeLimitMs);
  self.postMessage(result);
};
