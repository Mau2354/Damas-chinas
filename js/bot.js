const CheckersEngine = (function () {
  const SIZE = 8;

  function opponent(color) {
    return color === 'red' ? 'black' : 'red';
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function cloneBoard(board) {
    return board.map(row => row.map(cell => (cell ? { color: cell.color, king: cell.king } : null)));
  }

  function createInitialBoard() {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
      }
    }
    for (let r = 5; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
      }
    }
    return board;
  }

  function pieceMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return { moves: [], captures: [] };
    const dirs = piece.king
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

    const moves = [];
    const captures = [];

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (!board[nr][nc]) {
        moves.push({ from: [r, c], to: [nr, nc], captured: null });
      } else if (board[nr][nc].color === opponent(piece.color)) {
        const jr = nr + dr, jc = nc + dc;
        if (inBounds(jr, jc) && !board[jr][jc]) {
          captures.push({ from: [r, c], to: [jr, jc], captured: [nr, nc] });
        }
      }
    }
    return { moves, captures };
  }

  function allCapturesForColor(board, color) {
    const result = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const { captures } = pieceMoves(board, r, c);
          if (captures.length) result.push({ pos: [r, c], captures });
        }
      }
    }
    return result;
  }

  function movesForPiece(board, r, c, color) {
    const piece = board[r][c];
    if (!piece || piece.color !== color) return [];
    const forced = allCapturesForColor(board, color);
    if (forced.length > 0) {
      const mine = forced.find(f => f.pos[0] === r && f.pos[1] === c);
      return mine ? mine.captures : [];
    }
    const { moves } = pieceMoves(board, r, c);
    return moves;
  }

  function hasAnyMoves(board, color) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const { moves, captures } = pieceMoves(board, r, c);
          if (moves.length || captures.length) return true;
        }
      }
    }
    return false;
  }

  function applyMove(board, move) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = board[fr][fc];
    board[fr][fc] = null;
    board[tr][tc] = piece;

    let capturedPiece = null;
    if (move.captured) {
      const [cr, cc] = move.captured;
      capturedPiece = board[cr][cc];
      board[cr][cc] = null;
    }

    let promoted = false;
    if (!piece.king) {
      if (piece.color === 'red' && tr === 0) { piece.king = true; promoted = true; }
      if (piece.color === 'black' && tr === SIZE - 1) { piece.king = true; promoted = true; }
    }

    let furtherCaptures = [];
    if (move.captured) {
      furtherCaptures = pieceMoves(board, tr, tc).captures;
    }

    return { capturedPiece, promoted, furtherCaptures };
  }

  function allMoveSequences(board, color) {
    const forced = allCapturesForColor(board, color);
    const sequences = [];

    if (forced.length > 0) {
      for (const entry of forced) {
        for (const firstStep of entry.captures) {
          expandCaptureSequence(board, firstStep, [firstStep], sequences);
        }
      }
      return sequences;
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const { moves } = pieceMoves(board, r, c);
          for (const m of moves) sequences.push([m]);
        }
      }
    }
    return sequences;
  }

  function expandCaptureSequence(board, step, path, sequences) {
    const test = cloneBoard(board);
    applyMove(test, step);
    const [tr, tc] = step.to;
    const { captures } = pieceMoves(test, tr, tc);
    if (captures.length === 0) {
      sequences.push(path.slice());
      return;
    }
    for (const next of captures) {
      expandCaptureSequence(test, next, path.concat([next]), sequences);
    }
  }

  function applySequence(board, sequence) {
    const b = cloneBoard(board);
    for (const step of sequence) applyMove(b, step);
    return b;
  }

  const PIECE_VALUE = 100;
  const KING_VALUE = 160;

  function evaluate(board, botColor) {
    let score = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (!p) continue;
        let value = p.king ? KING_VALUE : PIECE_VALUE;
        if (!p.king) {
          const advancement = p.color === 'red' ? (SIZE - 1 - r) : r;
          value += advancement * 4;
        }
        const centerBonus = (c >= 2 && c <= 5) ? 3 : 0;
        value += centerBonus;
        score += (p.color === botColor) ? value : -value;
      }
    }
    return score;
  }

  function minimax(board, color, botColor, depth, alpha, beta) {
    const sequences = allMoveSequences(board, color);
    if (depth === 0 || sequences.length === 0) {
      if (sequences.length === 0) {
        // No moves = loss for `color`.
        const noMoveScore = (color === botColor) ? -100000 : 100000;
        return { score: noMoveScore + (color === botColor ? depth : -depth) };
      }
      return { score: evaluate(board, botColor) };
    }

    const maximizing = color === botColor;
    let best = null;

    for (const seq of sequences) {
      const nextBoard = applySequence(board, seq);
      const result = minimax(nextBoard, opponent(color), botColor, depth - 1, alpha, beta);
      const score = result.score;

      if (best === null ||
          (maximizing && score > best.score) ||
          (!maximizing && score < best.score)) {
        best = { score, sequence: seq };
      }

      if (maximizing) {
        alpha = Math.max(alpha, best.score);
      } else {
        beta = Math.min(beta, best.score);
      }
      if (beta <= alpha) break;
    }

    return best;
  }

  function findBestMove(board, color, depth) {
    const sequences = allMoveSequences(board, color);
    if (sequences.length === 0) return null;
    if (sequences.length === 1) return sequences[0];

    if (depth <= 1) {
      const scored = sequences.map(seq => {
        const b = applySequence(board, seq);
        return { seq, score: evaluate(b, color) + (Math.random() * 40 - 20) };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0].seq;
    }

    let best = null;
    let alpha = -Infinity, beta = Infinity;
    for (const seq of sequences) {
      const nextBoard = applySequence(board, seq);
      const result = minimax(nextBoard, opponent(color), color, depth - 1, alpha, beta);
      const score = result.score;
      if (best === null || score > best.score) {
        best = { score, sequence: seq };
      }
      alpha = Math.max(alpha, best.score);
    }
    return best.sequence;
  }

  return {
    SIZE,
    opponent,
    cloneBoard,
    createInitialBoard,
    pieceMoves,
    allCapturesForColor,
    movesForPiece,
    hasAnyMoves,
    applyMove,
    findBestMove
  };
})();
