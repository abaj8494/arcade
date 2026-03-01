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

// Piece image paths (cburnett SVGs)
const PIECE_IMAGES = {
  [PIECES.wP]: '/images/chess-pieces/wP.svg',
  [PIECES.wN]: '/images/chess-pieces/wN.svg',
  [PIECES.wB]: '/images/chess-pieces/wB.svg',
  [PIECES.wR]: '/images/chess-pieces/wR.svg',
  [PIECES.wQ]: '/images/chess-pieces/wQ.svg',
  [PIECES.wK]: '/images/chess-pieces/wK.svg',
  [PIECES.bP]: '/images/chess-pieces/bP.svg',
  [PIECES.bN]: '/images/chess-pieces/bN.svg',
  [PIECES.bB]: '/images/chess-pieces/bB.svg',
  [PIECES.bR]: '/images/chess-pieces/bR.svg',
  [PIECES.bQ]: '/images/chess-pieces/bQ.svg',
  [PIECES.bK]: '/images/chess-pieces/bK.svg',
};

// AI time limits per difficulty (each level adds 1 second)
const AI_TIME_LIMITS = {
  easy: 1000,
  medium: 2000,
  hard: 3000,
  expert: 4000,
  master: 5000,
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
  const aiWorkerRef = useRef(null);
  const { showHelp, toggleHelp } = useHelpVisibility();
  const notationRef = useRef(null);
  const [fenCopied, setFenCopied] = useState(false);

  // Pre-move state (max 20 queued moves)
  const MAX_PREMOVES = 20;
  const [preMoves, setPreMoves] = useState([]);
  const [preMovesEnabled, setPreMovesEnabled] = useState(true);
  const [preMoveSelection, setPreMoveSelection] = useState(null);

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

  // Reset game function - defined early because it's used in multiple places
  const resetGame = useCallback(() => {
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
    setPreMoves([]);
    setPreMoveSelection(null);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (aiWorkerRef.current) { aiWorkerRef.current.terminate(); aiWorkerRef.current = null; }
  }, []);

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
  }, [connectionState, playerNum, sendState, resetGame]);

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

  // Determine if it's the player's turn (for pre-move logic)
  const getMyColor = useCallback(() => {
    if (gameMode === 'ai') return playerColor;
    if (connectionState === 'connected' && myColour) return myColour;
    return currentPlayer; // In local 2-player, current player is always "my" turn
  }, [gameMode, playerColor, connectionState, myColour, currentPlayer]);

  const isMyTurn = useCallback(() => {
    const myColor = getMyColor();
    return myColor === currentPlayer;
  }, [getMyColor, currentPlayer]);

  // Check if pre-moves should be allowed (AI mode or wireless mode, not local 2-player)
  const canUsePremoves = gameMode === 'ai' || (connectionState === 'connected' && myColour);

  // Clear pre-moves
  const clearPreMoves = useCallback(() => {
    setPreMoves([]);
    setPreMoveSelection(null);
  }, []);

  // Handle square click
  const handleSquareClick = (row, col) => {
    if (gameOver || promotionSquare) return;

    const myColor = getMyColor();
    const isMyPiece = (piece) => piece && (
      (myColor === 'white' && isWhite(piece)) ||
      (myColor === 'black' && isBlack(piece))
    );

    // If it's my turn, handle normal moves
    if (isMyTurn() && !isAiThinking) {
      // Clear pre-move selection when it becomes our turn
      setPreMoveSelection(null);

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
      return;
    }

    // Not my turn - handle pre-moves if enabled
    if (!preMovesEnabled || !canUsePremoves) return;
    if (preMoves.length >= MAX_PREMOVES) return;

    const piece = board[row][col];

    // If we have a pre-move selection, try to complete the pre-move
    if (preMoveSelection) {
      const [fromRow, fromCol] = preMoveSelection;

      // Clicking same square cancels the selection
      if (fromRow === row && fromCol === col) {
        setPreMoveSelection(null);
        return;
      }

      // Clicking on another of my pieces switches selection
      if (isMyPiece(piece)) {
        setPreMoveSelection([row, col]);
        return;
      }

      // Add the pre-move - we'll validate it when executed
      // Don't add if clicking on own piece (already handled above)
      setPreMoves(prev => [...prev, { from: [fromRow, fromCol], to: [row, col] }]);
      setPreMoveSelection(null);
      return;
    }

    // Start a new pre-move selection if clicking on my piece
    if (isMyPiece(piece)) {
      setPreMoveSelection([row, col]);
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

  // Generate FEN string from current position
  const boardToFen = useCallback(() => {
    const PIECE_FEN = {
      [PIECES.wP]: 'P', [PIECES.wN]: 'N', [PIECES.wB]: 'B',
      [PIECES.wR]: 'R', [PIECES.wQ]: 'Q', [PIECES.wK]: 'K',
      [PIECES.bP]: 'p', [PIECES.bN]: 'n', [PIECES.bB]: 'b',
      [PIECES.bR]: 'r', [PIECES.bQ]: 'q', [PIECES.bK]: 'k',
    };

    // Piece placement
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let row = '';
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece === 0) {
          empty++;
        } else {
          if (empty > 0) { row += empty; empty = 0; }
          row += PIECE_FEN[piece] || '?';
        }
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }

    // Active color
    const active = currentPlayer === 'white' ? 'w' : 'b';

    // Castling
    let castling = '';
    if (castlingRights.wK) castling += 'K';
    if (castlingRights.wQ) castling += 'Q';
    if (castlingRights.bK) castling += 'k';
    if (castlingRights.bQ) castling += 'q';
    if (!castling) castling = '-';

    // En passant
    let ep = '-';
    if (enPassantSquare) {
      ep = FILES[enPassantSquare[1]] + RANKS[enPassantSquare[0]];
    }

    // Halfmove clock and fullmove number (approximate)
    const fullmove = Math.floor(moveHistory.length / 2) + 1;

    return `${rows.join('/')} ${active} ${castling} ${ep} 0 ${fullmove}`;
  }, [board, currentPlayer, castlingRights, enPassantSquare, moveHistory.length]);

  // Copy FEN to clipboard
  const copyFen = useCallback(() => {
    const fen = boardToFen();
    navigator.clipboard.writeText(fen).then(() => {
      setFenCopied(true);
      setTimeout(() => setFenCopied(false), 1500);
    }).catch(() => {});
  }, [boardToFen]);

  // Execute pre-moves when it becomes player's turn
  useEffect(() => {
    if (!isMyTurn() || preMoves.length === 0 || gameOver || promotionSquare || isAiThinking) return;

    // Small delay to let the UI update before executing pre-move
    const timeout = setTimeout(() => {
      const [preMove, ...remainingMoves] = preMoves;
      const { from, to } = preMove;
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;

      // Check if the pre-move is legal
      const legalMoves = getLegalMoves(board, fromRow, fromCol, castlingRights, enPassantSquare);
      const matchingMove = legalMoves.find(m => m[0] === toRow && m[1] === toCol);

      if (matchingMove) {
        const moveSuccess = makeMove(fromRow, fromCol, toRow, toCol, matchingMove[2]);
        if (moveSuccess) {
          if (connectionState === 'connected') {
            sendMove({ fromRow, fromCol, toRow, toCol, special: matchingMove[2] });
          }
          setPreMoves(remainingMoves);
        } else {
          // Move didn't complete (e.g., needs promotion) - clear pre-moves
          clearPreMoves();
        }
      } else {
        // Pre-move is no longer legal, clear all pre-moves
        clearPreMoves();
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [isMyTurn, preMoves, gameOver, promotionSquare, isAiThinking, board, castlingRights, enPassantSquare, getLegalMoves, makeMove, connectionState, sendMove, clearPreMoves]);

  // AI turn effect - uses Web Worker for non-blocking computation
  useEffect(() => {
    const aiColor = playerColor === 'white' ? 'black' : 'white';
    if (gameMode === 'ai' && currentPlayer === aiColor && !gameOver && !promotionSquare) {
      setIsAiThinking(true);
      let cancelled = false;

      // Small delay to allow UI to update and pre-moves to be queued
      aiTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;

        // Create or reuse Web Worker
        if (!aiWorkerRef.current) {
          aiWorkerRef.current = new Worker('/chess-worker.js');
        }
        const worker = aiWorkerRef.current;

        const onMessage = (e) => {
          worker.removeEventListener('message', onMessage);
          if (cancelled) return;

          const result = e.data;
          if (result?.bestMove) {
            const { bestMove } = result;
            makeMove(bestMove.from[0], bestMove.from[1], bestMove.to[0], bestMove.to[1], bestMove.special);
          }
          setIsAiThinking(false);
        };

        worker.addEventListener('message', onMessage);
        worker.postMessage({
          board,
          castlingRights,
          enPassantSquare,
          aiIsWhite: aiColor === 'white',
          timeLimitMs: AI_TIME_LIMITS[aiDifficulty] || 2000,
        });
      }, 200);

      return () => {
        cancelled = true;
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        // Terminate worker on cancel to stop computation immediately
        if (aiWorkerRef.current) {
          aiWorkerRef.current.terminate();
          aiWorkerRef.current = null;
        }
      };
    }
  }, [gameMode, currentPlayer, gameOver, promotionSquare, makeMove, playerColor, board, castlingRights, enPassantSquare, aiDifficulty]);

  // Check if a square is part of a pre-move
  const isPreMoveSquare = (row, col) => {
    return preMoves.some(pm =>
      (pm.from[0] === row && pm.from[1] === col) ||
      (pm.to[0] === row && pm.to[1] === col)
    );
  };

  const isPreMoveTo = (row, col) => {
    return preMoves.some(pm => pm.to[0] === row && pm.to[1] === col);
  };

  const getSquareClass = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
    const isPreMoveSelected = preMoveSelection && preMoveSelection[0] === row && preMoveSelection[1] === col;
    const isPreMove = isPreMoveSquare(row, col);
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
    } else if (isPreMoveSelected) {
      classes += 'bg-cyan-500 ';
    } else if (isPreMove) {
      classes += isLight ? 'bg-cyan-200 ' : 'bg-cyan-600 ';
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
                      <motion.img
                        src={PIECE_IMAGES[piece]}
                        alt=""
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 sm:w-11 sm:h-11 pointer-events-none select-none"
                        draggable={false}
                      />
                    )}

                    {/* Valid move indicator */}
                    {showMoveHints && validMoves.some(m => m[0] === actualRowIndex && m[1] === actualColIndex) && (
                      <div className={`absolute w-3 h-3 rounded-full ${
                        board[actualRowIndex][actualColIndex] ? 'ring-4 ring-green-500 ring-opacity-50 w-full h-full' : 'bg-green-500 opacity-50'
                      }`} />
                    )}

                    {/* Pre-move destination indicator */}
                    {isPreMoveTo(actualRowIndex, actualColIndex) && (
                      <div className="absolute w-3 h-3 rounded-full bg-cyan-400 opacity-70" />
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Promotion dialog */}
          {promotionSquare && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
            <div className="bg-surface p-4 rounded-lg">
              <p className="text-center mb-2">Choose promotion:</p>
              <div className="flex gap-2">
                {['Q', 'R', 'B', 'N'].map(p => {
                  const pieceKey = `${currentPlayer === 'white' ? 'w' : 'b'}${p}`;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePromotion(p)}
                      className="btn bg-gray-600 hover:bg-gray-500 w-14 h-14 flex items-center justify-center"
                    >
                      <img src={PIECE_IMAGES[PIECES[pieceKey]]} alt={p} className="w-10 h-10" />
                    </button>
                  );
                })}
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm">Moves</span>
              <button
                onClick={copyFen}
                className="text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                title="Copy FEN to clipboard"
              >
                {fenCopied ? 'Copied!' : 'FEN'}
              </button>
            </div>
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

      {/* Pre-move controls - only show in AI or wireless mode */}
      {canUsePremoves && (
        <div className="flex gap-4 mt-3 flex-wrap justify-center items-center">
          <button
            onClick={() => { setPreMovesEnabled(!preMovesEnabled); clearPreMoves(); }}
            className={`btn text-sm ${preMovesEnabled ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            Pre-moves {preMovesEnabled ? 'ON' : 'OFF'}
          </button>
          {preMoves.length > 0 && (
            <>
              <span className="text-cyan-400 text-sm">
                {preMoves.length} queued
              </span>
              <button
                onClick={clearPreMoves}
                className="btn text-sm bg-red-600 hover:bg-red-500"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

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
