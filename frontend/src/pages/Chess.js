import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

// Piece definitions
const PIECES = {
  EMPTY: 0,
  wP: 1, wN: 2, wB: 3, wR: 4, wQ: 5, wK: 6,
  bP: 7, bN: 8, bB: 9, bR: 10, bQ: 11, bK: 12
};

// Use filled piece symbols for both colors (solid pieces)
const PIECE_SYMBOLS = {
  [PIECES.wP]: '♟', [PIECES.wN]: '♞', [PIECES.wB]: '♝',
  [PIECES.wR]: '♜', [PIECES.wQ]: '♛', [PIECES.wK]: '♚',
  [PIECES.bP]: '♟', [PIECES.bN]: '♞', [PIECES.bB]: '♝',
  [PIECES.bR]: '♜', [PIECES.bQ]: '♛', [PIECES.bK]: '♚',
};

const PIECE_VALUES = {
  [PIECES.wP]: 100, [PIECES.wN]: 320, [PIECES.wB]: 330,
  [PIECES.wR]: 500, [PIECES.wQ]: 900, [PIECES.wK]: 20000,
  [PIECES.bP]: 100, [PIECES.bN]: 320, [PIECES.bB]: 330,
  [PIECES.bR]: 500, [PIECES.bQ]: 900, [PIECES.bK]: 20000,
};

// Piece letters for algebraic notation
const PIECE_LETTERS = {
  [PIECES.wN]: 'N', [PIECES.bN]: 'N',
  [PIECES.wB]: 'B', [PIECES.bB]: 'B',
  [PIECES.wR]: 'R', [PIECES.bR]: 'R',
  [PIECES.wQ]: 'Q', [PIECES.bQ]: 'Q',
  [PIECES.wK]: 'K', [PIECES.bK]: 'K',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Convert move to algebraic notation
const toAlgebraic = (move) => {
  const { from, to, piece, captured, special, promoteTo, isCheck, isCheckmate } = move;
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  // Castling
  if (special === 'castle') {
    return toCol === 6 ? 'O-O' : 'O-O-O';
  }

  let notation = '';

  // Piece letter (not for pawns)
  if (!isPawn(piece)) {
    notation += PIECE_LETTERS[piece] || '';
  }

  // For pawn captures, include the file
  if (isPawn(piece) && captured) {
    notation += FILES[fromCol];
  }

  // Capture symbol
  if (captured || special === 'ep') {
    notation += 'x';
  }

  // Destination square
  notation += FILES[toCol] + RANKS[toRow];

  // En passant notation
  if (special === 'ep') {
    notation += ' e.p.';
  }

  // Pawn promotion
  if (promoteTo) {
    notation += '=' + (PIECE_LETTERS[promoteTo] || 'Q');
  }

  // Check or checkmate
  if (isCheckmate) {
    notation += '#';
  } else if (isCheck) {
    notation += '+';
  }

  return notation;
};

const isWhite = (piece) => piece >= 1 && piece <= 6;
const isBlack = (piece) => piece >= 7 && piece <= 12;
const isPawn = (p) => p === PIECES.wP || p === PIECES.bP;
const isKnight = (p) => p === PIECES.wN || p === PIECES.bN;
const isBishop = (p) => p === PIECES.wB || p === PIECES.bB;
const isRook = (p) => p === PIECES.wR || p === PIECES.bR;
const isQueen = (p) => p === PIECES.wQ || p === PIECES.bQ;
const isKing = (p) => p === PIECES.wK || p === PIECES.bK;

const initialBoard = () => [
  [PIECES.bR, PIECES.bN, PIECES.bB, PIECES.bQ, PIECES.bK, PIECES.bB, PIECES.bN, PIECES.bR],
  [PIECES.bP, PIECES.bP, PIECES.bP, PIECES.bP, PIECES.bP, PIECES.bP, PIECES.bP, PIECES.bP],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [PIECES.wP, PIECES.wP, PIECES.wP, PIECES.wP, PIECES.wP, PIECES.wP, PIECES.wP, PIECES.wP],
  [PIECES.wR, PIECES.wN, PIECES.wB, PIECES.wQ, PIECES.wK, PIECES.wB, PIECES.wN, PIECES.wR],
];

const Chess = () => {
  const [board, setBoard] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [castlingRights, setCastlingRights] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [enPassantSquare, setEnPassantSquare] = useState(null);
  const [gameMode, setGameMode] = useState('2player');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [showMoveHints, setShowMoveHints] = useState(true);
  const [showNotation, setShowNotation] = useState(true);
  const aiTimeoutRef = useRef(null);
  const { showHelp, toggleHelp } = useHelpVisibility();
  const notationRef = useRef(null);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [myColour, setMyColour] = useState(null);
  const wirelessMoveRef = useRef(null);

  // Find king position
  const findKing = useCallback((board, isWhiteKing) => {
    const king = isWhiteKing ? PIECES.wK : PIECES.bK;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === king) return [r, c];
      }
    }
    return null;
  }, []);

  // Check if square is attacked by opponent
  const isSquareAttacked = useCallback((board, row, col, byWhite) => {
    // Pawn attacks
    const pawnDir = byWhite ? 1 : -1;
    const pawn = byWhite ? PIECES.wP : PIECES.bP;
    if (row + pawnDir >= 0 && row + pawnDir < 8) {
      if (col > 0 && board[row + pawnDir][col - 1] === pawn) return true;
      if (col < 7 && board[row + pawnDir][col + 1] === pawn) return true;
    }

    // Knight attacks
    const knight = byWhite ? PIECES.wN : PIECES.bN;
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightMoves) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === knight) return true;
    }

    // King attacks
    const king = byWhite ? PIECES.wK : PIECES.bK;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === king) return true;
      }
    }

    // Sliding piece attacks (bishop, rook, queen)
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],  // Rook/Queen directions
      [-1, -1], [-1, 1], [1, -1], [1, 1]  // Bishop/Queen directions
    ];
    const rook = byWhite ? PIECES.wR : PIECES.bR;
    const bishop = byWhite ? PIECES.wB : PIECES.bB;
    const queen = byWhite ? PIECES.wQ : PIECES.bQ;

    for (let i = 0; i < directions.length; i++) {
      const [dr, dc] = directions[i];
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const piece = board[nr][nc];
        if (piece !== 0) {
          if (i < 4) { // Straight lines
            if (piece === rook || piece === queen) return true;
          } else { // Diagonals
            if (piece === bishop || piece === queen) return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }, []);

  // Check if current player is in check
  const isInCheck = useCallback((board, isWhiteTurn) => {
    const kingPos = findKing(board, isWhiteTurn);
    if (!kingPos) return false;
    return isSquareAttacked(board, kingPos[0], kingPos[1], !isWhiteTurn);
  }, [findKing, isSquareAttacked]);

  // Generate pseudo-legal moves for a piece
  const getPseudoLegalMoves = useCallback((board, row, col, castling, enPassant) => {
    const piece = board[row][col];
    if (piece === 0) return [];

    const moves = [];
    const white = isWhite(piece);

    if (isPawn(piece)) {
      const dir = white ? -1 : 1;
      const startRow = white ? 6 : 1;
      const promoRow = white ? 0 : 7;

      // Forward move
      if (board[row + dir]?.[col] === 0) {
        moves.push([row + dir, col]);
        // Double move from start
        if (row === startRow && board[row + 2 * dir]?.[col] === 0) {
          moves.push([row + 2 * dir, col]);
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (nc >= 0 && nc < 8) {
          const target = board[row + dir]?.[nc];
          if (target && (white ? isBlack(target) : isWhite(target))) {
            moves.push([row + dir, nc]);
          }
          // En passant
          if (enPassant && enPassant[0] === row + dir && enPassant[1] === nc) {
            moves.push([row + dir, nc, 'ep']);
          }
        }
      }
    } else if (isKnight(piece)) {
      const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
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
        if (castling.wK && board[7][5] === 0 && board[7][6] === 0 && board[7][7] === PIECES.wR) {
          if (!isSquareAttacked(board, 7, 4, false) && !isSquareAttacked(board, 7, 5, false) && !isSquareAttacked(board, 7, 6, false)) {
            moves.push([7, 6, 'castle']);
          }
        }
        if (castling.wQ && board[7][3] === 0 && board[7][2] === 0 && board[7][1] === 0 && board[7][0] === PIECES.wR) {
          if (!isSquareAttacked(board, 7, 4, false) && !isSquareAttacked(board, 7, 3, false) && !isSquareAttacked(board, 7, 2, false)) {
            moves.push([7, 2, 'castle']);
          }
        }
      } else if (!white && row === 0 && col === 4) {
        if (castling.bK && board[0][5] === 0 && board[0][6] === 0 && board[0][7] === PIECES.bR) {
          if (!isSquareAttacked(board, 0, 4, true) && !isSquareAttacked(board, 0, 5, true) && !isSquareAttacked(board, 0, 6, true)) {
            moves.push([0, 6, 'castle']);
          }
        }
        if (castling.bQ && board[0][3] === 0 && board[0][2] === 0 && board[0][1] === 0 && board[0][0] === PIECES.bR) {
          if (!isSquareAttacked(board, 0, 4, true) && !isSquareAttacked(board, 0, 3, true) && !isSquareAttacked(board, 0, 2, true)) {
            moves.push([0, 2, 'castle']);
          }
        }
      }
    } else {
      // Sliding pieces
      const directions = [];
      if (isRook(piece) || isQueen(piece)) {
        directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      if (isBishop(piece) || isQueen(piece)) {
        directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }

      for (const [dr, dc] of directions) {
        let nr = row + dr, nc = col + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (target === 0) {
            moves.push([nr, nc]);
          } else {
            if (white ? isBlack(target) : isWhite(target)) {
              moves.push([nr, nc]);
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }

    return moves;
  }, [isSquareAttacked]);

  // Get legal moves (filter out moves that leave king in check)
  const getLegalMoves = useCallback((board, row, col, castling, enPassant) => {
    const piece = board[row][col];
    if (piece === 0) return [];
    const white = isWhite(piece);
    const pseudoMoves = getPseudoLegalMoves(board, row, col, castling, enPassant);

    return pseudoMoves.filter(move => {
      const [nr, nc, special] = move;
      const newBoard = board.map(r => [...r]);

      // Make the move
      newBoard[nr][nc] = piece;
      newBoard[row][col] = 0;

      // Handle en passant capture
      if (special === 'ep') {
        newBoard[row][nc] = 0;
      }

      // Handle castling
      if (special === 'castle') {
        if (nc === 6) { // Kingside
          newBoard[nr][5] = newBoard[nr][7];
          newBoard[nr][7] = 0;
        } else { // Queenside
          newBoard[nr][3] = newBoard[nr][0];
          newBoard[nr][0] = 0;
        }
      }

      return !isInCheck(newBoard, white);
    });
  }, [getPseudoLegalMoves, isInCheck]);

  // Check for checkmate or stalemate
  const getGameStatus = useCallback((board, isWhiteTurn, castling, enPassant) => {
    let hasLegalMove = false;

    for (let r = 0; r < 8 && !hasLegalMove; r++) {
      for (let c = 0; c < 8 && !hasLegalMove; c++) {
        const piece = board[r][c];
        if (piece && (isWhiteTurn ? isWhite(piece) : isBlack(piece))) {
          const moves = getLegalMoves(board, r, c, castling, enPassant);
          if (moves.length > 0) hasLegalMove = true;
        }
      }
    }

    if (!hasLegalMove) {
      if (isInCheck(board, isWhiteTurn)) {
        return isWhiteTurn ? 'black_wins' : 'white_wins';
      }
      return 'stalemate';
    }
    return null;
  }, [getLegalMoves, isInCheck]);

  // Make a move
  const makeMove = useCallback((fromRow, fromCol, toRow, toCol, special, promoteTo) => {
    const piece = board[fromRow][fromCol];
    const newBoard = board.map(r => [...r]);
    const captured = newBoard[toRow][toCol];
    const white = isWhite(piece);

    // Handle pawn promotion
    if (isPawn(piece) && (toRow === 0 || toRow === 7)) {
      if (!promoteTo) {
        setPromotionSquare({ from: [fromRow, fromCol], to: [toRow, toCol] });
        return false;
      }
      newBoard[toRow][toCol] = promoteTo;
    } else {
      newBoard[toRow][toCol] = piece;
    }
    newBoard[fromRow][fromCol] = 0;

    // Handle en passant
    if (special === 'ep') {
      newBoard[fromRow][toCol] = 0;
    }

    // Handle castling
    if (special === 'castle') {
      if (toCol === 6) {
        newBoard[toRow][5] = newBoard[toRow][7];
        newBoard[toRow][7] = 0;
      } else {
        newBoard[toRow][3] = newBoard[toRow][0];
        newBoard[toRow][0] = 0;
      }
    }

    // Update castling rights
    const newCastling = { ...castlingRights };
    if (isKing(piece)) {
      if (white) { newCastling.wK = false; newCastling.wQ = false; }
      else { newCastling.bK = false; newCastling.bQ = false; }
    }
    if (isRook(piece)) {
      if (fromRow === 7 && fromCol === 0) newCastling.wQ = false;
      if (fromRow === 7 && fromCol === 7) newCastling.wK = false;
      if (fromRow === 0 && fromCol === 0) newCastling.bQ = false;
      if (fromRow === 0 && fromCol === 7) newCastling.bK = false;
    }
    if (toRow === 7 && toCol === 0) newCastling.wQ = false;
    if (toRow === 7 && toCol === 7) newCastling.wK = false;
    if (toRow === 0 && toCol === 0) newCastling.bQ = false;
    if (toRow === 0 && toCol === 7) newCastling.bK = false;

    // Set en passant square
    let newEnPassant = null;
    if (isPawn(piece) && Math.abs(toRow - fromRow) === 2) {
      newEnPassant = [(fromRow + toRow) / 2, fromCol];
    }

    setBoard(newBoard);
    setCastlingRights(newCastling);
    setEnPassantSquare(newEnPassant);
    setLastMove({ from: [fromRow, fromCol], to: [toRow, toCol] });

    const nextPlayer = white ? 'black' : 'white';

    // Check game status and determine if this move gives check/checkmate
    const status = getGameStatus(newBoard, !white, newCastling, newEnPassant);
    const givesCheck = isInCheck(newBoard, !white);
    const isCheckmate = status === (white ? 'black_wins' : 'white_wins');

    setMoveHistory(prev => [...prev, {
      from: [fromRow, fromCol],
      to: [toRow, toCol],
      piece,
      captured,
      special,
      promoteTo,
      isCheck: givesCheck && !isCheckmate,
      isCheckmate
    }]);
    setSelectedSquare(null);
    setValidMoves([]);

    setCurrentPlayer(nextPlayer);

    if (status) {
      setGameOver(status);
    }

    return true;
  }, [board, castlingRights, getGameStatus, isInCheck]);

  // Wireless game hook
  const handleWirelessMove = useCallback((move) => {
    if (wirelessMoveRef.current) {
      wirelessMoveRef.current(move);
    }
  }, []);

  const handleWirelessState = useCallback((state) => {
    if (state.board) setBoard(state.board);
    if (state.currentPlayer) setCurrentPlayer(state.currentPlayer);
    if (state.castlingRights) setCastlingRights(state.castlingRights);
    if (state.enPassantSquare !== undefined) setEnPassantSquare(state.enPassantSquare);
    if (state.lastMove !== undefined) setLastMove(state.lastMove);
    if (state.gameOver !== undefined) setGameOver(state.gameOver);
  }, []);

  const { connectionState, playerNum, roomCode, error, createRoom, joinRoom, disconnect, sendMove, sendState } =
    useWirelessGame('chess', handleWirelessMove, handleWirelessState);

  // Determine if board should be flipped (black at bottom)
  // In wireless mode: flip when playing as black
  // In 2-player local mode: never flip (white always at bottom)
  // In AI mode: flip when player chose to play as black
  const flipBoard = gameMode === 'ai' ? playerColor === 'black' :
    (connectionState === 'connected' && myColour) ? myColour === 'black' :
    false;

  // Update wirelessMoveRef with the actual move handler
  useEffect(() => {
    wirelessMoveRef.current = (move) => {
      const { fromRow, fromCol, toRow, toCol, special, promoteTo } = move;
      makeMove(fromRow, fromCol, toRow, toCol, special, promoteTo);
    };
  }, [makeMove]);

  // Handle wireless connection - player 1 is white, player 2 is black
  useEffect(() => {
    if (connectionState === 'connected' && playerNum) {
      setMyColour(playerNum === 1 ? 'white' : 'black');
      setGameMode('2player');
      // Player 1 initialises the game
      if (playerNum === 1) {
        resetGame();
        sendState({
          board: initialBoard(),
          currentPlayer: 'white',
          castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
          enPassantSquare: null,
          lastMove: null,
          gameOver: null
        });
      }
    }
  }, [connectionState, playerNum, sendState]);

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = (code) => {
    joinRoom(code);
  };

  const handleDisconnect = () => {
    disconnect();
    setMyColour(null);
    resetGame();
  };

  // Handle square click
  const handleSquareClick = (row, col) => {
    if (gameOver || isAiThinking || promotionSquare) return;
    const aiColor = playerColor === 'white' ? 'black' : 'white';
    if (gameMode === 'ai' && currentPlayer === aiColor) return;

    // Check if it's our turn in wireless mode
    if (connectionState === 'connected' && myColour) {
      const isMyTurn = (myColour === 'white' && currentPlayer === 'white') ||
                       (myColour === 'black' && currentPlayer === 'black');
      if (!isMyTurn) return;
    }

    const piece = board[row][col];
    const isCurrentPlayerPiece = piece && (
      (currentPlayer === 'white' && isWhite(piece)) ||
      (currentPlayer === 'black' && isBlack(piece))
    );

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const move = validMoves.find(m => m[0] === row && m[1] === col);

      if (move) {
        const moveSuccess = makeMove(fromRow, fromCol, row, col, move[2]);
        // Send move over wireless
        if (moveSuccess && connectionState === 'connected') {
          sendMove({ fromRow, fromCol, toRow: row, toCol: col, special: move[2] });
        }
        return;
      }
    }

    if (isCurrentPlayerPiece) {
      setSelectedSquare([row, col]);
      setValidMoves(getLegalMoves(board, row, col, castlingRights, enPassantSquare));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Handle promotion selection
  const handlePromotion = (pieceType) => {
    if (!promotionSquare) return;
    const { from, to } = promotionSquare;
    const white = currentPlayer === 'white';
    const promotionPiece = white ?
      { Q: PIECES.wQ, R: PIECES.wR, B: PIECES.wB, N: PIECES.wN }[pieceType] :
      { Q: PIECES.bQ, R: PIECES.bR, B: PIECES.bB, N: PIECES.bN }[pieceType];

    setPromotionSquare(null);
    const moveSuccess = makeMove(from[0], from[1], to[0], to[1], null, promotionPiece);
    if (moveSuccess && connectionState === 'connected') {
      sendMove({ fromRow: from[0], fromCol: from[1], toRow: to[0], toCol: to[1], promoteTo: promotionPiece });
    }
  };

  // AI move using minimax
  const evaluateBoard = useCallback((board) => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const value = PIECE_VALUES[piece] || 0;
          score += isWhite(piece) ? value : -value;

          // Position bonuses
          if (isPawn(piece)) {
            const advance = isWhite(piece) ? (6 - r) : (r - 1);
            score += isWhite(piece) ? advance * 10 : -advance * 10;
          }
          // Centre control bonus
          if ((c === 3 || c === 4) && (r === 3 || r === 4)) {
            score += isWhite(piece) ? 30 : -30;
          }
        }
      }
    }
    return score;
  }, []);

  const minimax = useCallback((board, depth, alpha, beta, isMaximizing, castling, enPassant) => {
    if (depth === 0) {
      return evaluateBoard(board);
    }

    const status = getGameStatus(board, isMaximizing, castling, enPassant);
    if (status === 'white_wins') return -100000 + depth;
    if (status === 'black_wins') return 100000 - depth;
    if (status === 'stalemate') return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && isBlack(piece)) {
            const moves = getLegalMoves(board, r, c, castling, enPassant);
            for (const move of moves) {
              const [nr, nc, special] = move;
              const newBoard = board.map(row => [...row]);
              newBoard[nr][nc] = piece;
              newBoard[r][c] = 0;
              if (special === 'ep') newBoard[r][nc] = 0;
              if (special === 'castle') {
                if (nc === 6) { newBoard[nr][5] = newBoard[nr][7]; newBoard[nr][7] = 0; }
                else { newBoard[nr][3] = newBoard[nr][0]; newBoard[nr][0] = 0; }
              }

              const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, castling, null);
              maxEval = Math.max(maxEval, evalScore);
              alpha = Math.max(alpha, evalScore);
              if (beta <= alpha) break;
            }
          }
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && isWhite(piece)) {
            const moves = getLegalMoves(board, r, c, castling, enPassant);
            for (const move of moves) {
              const [nr, nc, special] = move;
              const newBoard = board.map(row => [...row]);
              newBoard[nr][nc] = piece;
              newBoard[r][c] = 0;
              if (special === 'ep') newBoard[r][nc] = 0;
              if (special === 'castle') {
                if (nc === 6) { newBoard[nr][5] = newBoard[nr][7]; newBoard[nr][7] = 0; }
                else { newBoard[nr][3] = newBoard[nr][0]; newBoard[nr][0] = 0; }
              }

              const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, castling, null);
              minEval = Math.min(minEval, evalScore);
              beta = Math.min(beta, evalScore);
              if (beta <= alpha) break;
            }
          }
        }
      }
      return minEval;
    }
  }, [evaluateBoard, getGameStatus, getLegalMoves]);

  const getAiMove = useCallback((aiIsWhite) => {
    const depths = { easy: 2, medium: 3, hard: 4, expert: 5, master: 6 };
    const depth = depths[aiDifficulty];

    let bestMove = null;
    let bestScore = aiIsWhite ? Infinity : -Infinity;
    const isAiPiece = aiIsWhite ? isWhite : isBlack;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && isAiPiece(piece)) {
          const moves = getLegalMoves(board, r, c, castlingRights, enPassantSquare);
          for (const move of moves) {
            const [nr, nc, special] = move;
            const newBoard = board.map(row => [...row]);
            newBoard[nr][nc] = piece;
            newBoard[r][c] = 0;
            if (special === 'ep') newBoard[r][nc] = 0;
            if (special === 'castle') {
              if (nc === 6) { newBoard[nr][5] = newBoard[nr][7]; newBoard[nr][7] = 0; }
              else { newBoard[nr][3] = newBoard[nr][0]; newBoard[nr][0] = 0; }
            }

            const score = minimax(newBoard, depth - 1, -Infinity, Infinity, !aiIsWhite, castlingRights, null);
            if (aiIsWhite) {
              // AI is white, minimize score (white wants negative scores from black's perspective)
              if (score < bestScore || (score === bestScore && Math.random() > 0.5)) {
                bestScore = score;
                bestMove = { from: [r, c], to: [nr, nc], special };
              }
            } else {
              // AI is black, maximize score
              if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
                bestScore = score;
                bestMove = { from: [r, c], to: [nr, nc], special };
              }
            }
          }
        }
      }
    }

    return bestMove;
  }, [board, aiDifficulty, castlingRights, enPassantSquare, getLegalMoves, minimax]);

  // AI turn effect
  useEffect(() => {
    const aiColor = playerColor === 'white' ? 'black' : 'white';
    if (gameMode === 'ai' && currentPlayer === aiColor && !gameOver && !promotionSquare) {
      setIsAiThinking(true);
      aiTimeoutRef.current = setTimeout(() => {
        const move = getAiMove(aiColor === 'white');
        if (move) {
          makeMove(move.from[0], move.from[1], move.to[0], move.to[1], move.special);
        }
        setIsAiThinking(false);
      }, 500);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameMode, currentPlayer, gameOver, promotionSquare, getAiMove, makeMove, playerColor]);

  const resetGame = () => {
    setBoard(initialBoard());
    setCurrentPlayer('white');
    setSelectedSquare(null);
    setValidMoves([]);
    setGameOver(null);
    setMoveHistory([]);
    setCastlingRights({ wK: true, wQ: true, bK: true, bQ: true });
    setEnPassantSquare(null);
    setPromotionSquare(null);
    setLastMove(null);
    setIsAiThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  };

  const getSquareClass = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
    const isValidMove = validMoves.some(m => m[0] === row && m[1] === col);
    const isLastMoveSquare = lastMove && (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    );
    const isCheck = isKing(board[row][col]) && isInCheck(board, isWhite(board[row][col])) && !gameOver;

    let classes = 'w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-3xl sm:text-4xl cursor-pointer relative ';

    if (isCheck) {
      classes += 'bg-red-500 ';
    } else if (isSelected) {
      classes += 'bg-yellow-500 ';
    } else if (isLastMoveSquare) {
      classes += isLight ? 'bg-yellow-200 ' : 'bg-yellow-600 ';
    } else {
      classes += isLight ? 'bg-amber-100 ' : 'bg-amber-700 ';
    }

    return classes;
  };

  const getStatusText = () => {
    if (gameOver === 'white_wins') return 'Checkmate! White wins!';
    if (gameOver === 'black_wins') return 'Checkmate! Black wins!';
    if (gameOver === 'stalemate') return 'Stalemate! Draw!';
    if (isAiThinking) return 'AI is thinking...';
    const inCheck = isInCheck(board, currentPlayer === 'white');
    const turnText = `${currentPlayer === 'white' ? 'White' : 'Black'}'s turn${inCheck ? ' - Check!' : ''}`;
    if (connectionState === 'connected' && myColour) {
      const isMyTurn = myColour === currentPlayer;
      return `${turnText} ${isMyTurn ? '(Your turn)' : '(Waiting...)'}`;
    }
    return turnText;
  };

  // Auto-scroll notation panel to bottom
  useEffect(() => {
    if (notationRef.current) {
      notationRef.current.scrollTop = notationRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Group moves into pairs for display
  const getMovePairs = () => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moveHistory[i] ? toAlgebraic(moveHistory[i]) : '',
        black: moveHistory[i + 1] ? toAlgebraic(moveHistory[i + 1]) : ''
      });
    }
    return pairs;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Chess</h1>
        <WirelessButton
          onClick={() => connectionState === 'connected' ? handleDisconnect() : setShowWirelessModal(true)}
          isActive={connectionState === 'connected' || connectionState === 'waiting'}
          disabled={gameMode === 'ai'}
        />
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      {/* Wireless connection status */}
      {connectionState === 'connected' && (
        <div className="mb-4 text-green-400 text-sm">
          Connected - Playing as {myColour === 'white' ? 'White' : 'Black'}
        </div>
      )}

      {/* Game Mode Selection */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => { setGameMode('2player'); resetGame(); handleDisconnect(); }}
          className={`btn ${gameMode === '2player' && connectionState !== 'connected' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          disabled={connectionState === 'connected'}
        >
          2 Player
        </button>
        <button
          onClick={() => { setGameMode('ai'); resetGame(); handleDisconnect(); }}
          className={`btn ${gameMode === 'ai' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          disabled={connectionState === 'connected'}
        >
          vs AI
        </button>
      </div>

      {/* AI Difficulty */}
      {gameMode === 'ai' && (
        <div className="mb-4 flex flex-col gap-2 items-center">
          <div className="flex gap-2">
            {['easy', 'medium', 'hard', 'expert', 'master'].map((diff) => (
              <button
                key={diff}
                onClick={() => { setAiDifficulty(diff); resetGame(); }}
                className={`btn text-sm ${aiDifficulty === diff ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 text-sm">Play as:</span>
            <button
              onClick={() => { setPlayerColor('white'); resetGame(); }}
              className={`btn text-sm ${playerColor === 'white' ? 'bg-white text-black' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              White
            </button>
            <button
              onClick={() => { setPlayerColor('black'); resetGame(); }}
              className={`btn text-sm ${playerColor === 'black' ? 'bg-gray-800 border border-white' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              Black
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <motion.div
        key={getStatusText()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-xl mb-4 font-semibold ${
          gameOver ? 'text-green-400' : currentPlayer === 'white' ? 'text-white' : 'text-gray-300'
        }`}
      >
        {getStatusText()}
      </motion.div>

      {/* Board and Notation Sidebar */}
      <div className="flex justify-center items-start w-full">
        {/* Left spacer for balance */}
        <div className="hidden sm:block w-40 sm:w-48 flex-shrink-0" />

        {/* Board - centered */}
        <div className="relative mx-4">
          <div className="grid grid-cols-8 border-4 border-amber-900 rounded">
            {(flipBoard ? [...board].reverse() : board).map((row, displayRowIndex) => {
              const actualRowIndex = flipBoard ? 7 - displayRowIndex : displayRowIndex;
              return (flipBoard ? [...row].reverse() : row).map((piece, displayColIndex) => {
                const actualColIndex = flipBoard ? 7 - displayColIndex : displayColIndex;
                return (
                  <div
                    key={`${actualRowIndex}-${actualColIndex}`}
                    className={getSquareClass(actualRowIndex, actualColIndex)}
                    onClick={() => handleSquareClick(actualRowIndex, actualColIndex)}
                  >
                    {piece !== 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={isWhite(piece) ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}
                        style={{ textShadow: isWhite(piece) ? '0 0 3px #000' : 'none' }}
                      >
                        {PIECE_SYMBOLS[piece]}
                      </motion.span>
                    )}

                    {/* Valid move indicator */}
                    {showMoveHints && validMoves.some(m => m[0] === actualRowIndex && m[1] === actualColIndex) && (
                      <div className={`absolute w-3 h-3 rounded-full ${
                        board[actualRowIndex][actualColIndex] ? 'ring-4 ring-green-500 ring-opacity-50 w-full h-full' : 'bg-green-500 opacity-50'
                      }`} />
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Promotion dialog */}
          {promotionSquare && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="bg-surface p-4 rounded-lg">
              <p className="text-center mb-2">Choose promotion:</p>
              <div className="flex gap-2">
                {['Q', 'R', 'B', 'N'].map(p => (
                  <button
                    key={p}
                    onClick={() => handlePromotion(p)}
                    className="btn bg-gray-600 hover:bg-gray-500 text-3xl w-12 h-12"
                  >
                    {currentPlayer === 'white' ?
                      PIECE_SYMBOLS[PIECES[`w${p}`]] :
                      PIECE_SYMBOLS[PIECES[`b${p}`]]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

          {/* File labels */}
          <div className="flex mt-1">
            {(flipBoard ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map(f => (
              <div key={f} className="w-10 sm:w-14 text-center text-gray-400 text-sm">{f}</div>
            ))}
          </div>
        </div>

        {/* Notation Sidebar - right pane */}
        <div className={`bg-surface rounded-lg p-3 w-40 sm:w-48 flex-shrink-0 hidden sm:block ${showNotation ? '' : 'invisible'}`}>
            <div className="text-white font-semibold mb-2 text-sm">Moves</div>
            <div
              ref={notationRef}
              className="max-h-64 sm:max-h-80 overflow-y-auto text-sm font-mono"
            >
              {moveHistory.length === 0 ? (
                <div className="text-gray-500 text-xs">No moves yet</div>
              ) : (
                getMovePairs().map((pair, idx) => (
                  <div key={idx} className="flex gap-2 py-0.5">
                    <span className="text-gray-500 w-6">{pair.num}.</span>
                    <span className="text-white w-14">{pair.white}</span>
                    <span className="text-gray-300 w-14">{pair.black}</span>
                  </div>
                ))
              )}
            </div>
          </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-4 flex-wrap justify-center">
        <button onClick={resetGame} className="btn btn-primary">
          New Game
        </button>
        <button
          onClick={() => setShowMoveHints(!showMoveHints)}
          className={`btn ${showMoveHints ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Hints {showMoveHints ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setShowNotation(!showNotation)}
          className={`btn hidden sm:block ${showNotation ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Notation {showNotation ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Move count (shown on mobile where notation is hidden) */}
      <div className="mt-4 text-gray-400 sm:hidden">
        Moves: {moveHistory.length}
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={connectionState}
        playerNum={playerNum}
        roomCode={roomCode}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onDisconnect={handleDisconnect}
        gameName="Chess"
      />
    </div>
  );
};

export default Chess;
