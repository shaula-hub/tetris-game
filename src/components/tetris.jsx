import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// Tetromino shapes
const TETROMINO_SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

// Function to generate random RGB color
const generateRandomColor = () => {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgb(${r}, ${g}, ${b})`;
};

// Simple Dialog Component
const GameOverDialog = ({
  score,
  // onRestart,
  show,
  setShowGameOverDialog,
  setGameStarted,
}) => {
  if (!show) return null;

  const handleRestart = () => {
    setShowGameOverDialog(false);
    setGameStarted(false);
    // No onRestart call here
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Game Over!</h2>
        <p className="mb-4">Your final score: {score} points</p>
        <button
          onClick={handleRestart}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          autoFocus
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

const TetrisGame = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const startButtonRef = useRef(null);
  const [guideLines, setGuideLines] = useState({
    left: -1,
    right: -1,
    height: 0,
  });

  // Create empty board
  function createEmptyBoard() {
    return Array(BOARD_HEIGHT)
      .fill()
      .map(() => Array(BOARD_WIDTH).fill(null));
  }

  const generateRandomPiece = useCallback(() => {
    const pieces = Object.keys(TETROMINO_SHAPES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      shape: TETROMINO_SHAPES[randomPiece],
      color: generateRandomColor(),
    };
  }, []);

  // Check collision
  const hasCollision = useCallback(
    (piece, pos) => {
      if (!piece) return false;

      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const newX = pos.x + x;
            const newY = pos.y + y;

            // Check both board bounds and existing pieces
            if (
              newX < 0 ||
              newX >= BOARD_WIDTH ||
              newY >= BOARD_HEIGHT ||
              (newY >= 0 && board[newY][newX]) ||
              (newY < 0 && board[0][newX])
            ) {
              // Added this check
              return true;
            }
          }
        }
      }
      return false;
    },
    [board]
  );

  // Check for game over
  const checkGameOver = useCallback(
    (piece, pos) => {
      if (!piece) return false;
      return hasCollision(piece, pos);
    },
    [hasCollision]
  );

  // Merge piece with board
  const mergePieceWithBoard = useCallback(() => {
    if (!currentPiece) return board;

    const newBoard = board.map((row) => [...row]);

    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = position.y + y;
          if (boardY < 0) {
            setGameOver(true);
            setShowGameOverDialog(true);
            return board;
          }
          newBoard[boardY][position.x + x] = currentPiece.color;
        }
      }
    }

    return newBoard;
  }, [board, currentPiece, position]);

  // Clear completed rows
  const clearRows = useCallback((boardToCheck) => {
    const newBoard = boardToCheck.filter((row) => row.some((cell) => !cell));
    const clearedRows = BOARD_HEIGHT - newBoard.length;
    const newRows = Array(clearedRows)
      .fill()
      .map(() => Array(BOARD_WIDTH).fill(null));
    setScore((prevScore) => prevScore + clearedRows * 100);
    return [...newRows, ...newBoard];
  }, []);

  const calculateGuidelines = useCallback(
    (piece, pos) => {
      let minX = BOARD_WIDTH;
      let maxX = -1;
      let bottomY = BOARD_HEIGHT;

      piece.shape.forEach((row) => {
        row.forEach((cell, colIndex) => {
          if (cell) {
            const absoluteX = pos.x + colIndex;
            minX = Math.min(minX, absoluteX);
            maxX = Math.max(maxX, absoluteX);
          }
        });
      });

      for (let x = minX; x <= maxX; x++) {
        let y = pos.y + piece.shape.length;
        while (y < BOARD_HEIGHT && !board[y][x]) {
          y++;
        }
        bottomY = Math.min(bottomY, y);
      }

      return {
        left: minX,
        right: maxX,
        stopY: bottomY,
      };
    },
    [board]
  );

  [
    position,
    currentPiece,
    nextPiece,
    gameOver,
    hasCollision,
    mergePieceWithBoard,
    clearRows,
    generateRandomPiece,
    checkGameOver,
    calculateGuidelines,
  ];

  const movePiece = useCallback(
    (dx, dy) => {
      if (!currentPiece || gameOver) return false;

      const newPos = { x: position.x + dx, y: position.y + dy };
      if (!hasCollision(currentPiece, newPos)) {
        const guidelines = calculateGuidelines(currentPiece, newPos);
        setPosition(newPos);
        setGuideLines(guidelines);
        return true;
      }

      if (dy > 0) {
        const newBoard = mergePieceWithBoard();
        if (!gameOver) {
          setBoard(clearRows(newBoard));
          setGuideLines({ left: -1, right: -1, height: 0 });
          setCurrentPiece(null);

          setTimeout(() => {
            const newPos = { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 };
            const newPiece = nextPiece;
            setCurrentPiece(newPiece);
            setPosition(newPos);
            setNextPiece(generateRandomPiece());

            if (!checkGameOver(newPiece, newPos)) {
              const guidelines = calculateGuidelines(newPiece, newPos);
              setGuideLines(guidelines);
            } else {
              setGameOver(true);
              setShowGameOverDialog(true);
            }
          }, 250);
        }
      }
      return false;
    },
    [
      position,
      currentPiece,
      nextPiece,
      gameOver,
      hasCollision,
      mergePieceWithBoard,
      clearRows,
      generateRandomPiece,
      checkGameOver,
      calculateGuidelines,
    ]
  );

  const accelerateDrop = useCallback(() => {
    if (!currentPiece || gameOver) return;

    let dropY = position.y;
    while (!hasCollision(currentPiece, { x: position.x, y: dropY + 1 })) {
      dropY++;
    }

    setPosition({ x: position.x, y: dropY });
  }, [currentPiece, gameOver, position.x, position.y, hasCollision]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver) return null;

    const currentRows = currentPiece.shape.length;
    const currentCols = currentPiece.shape[0].length;
    const rotatedRows = currentCols;
    const rotatedCols = currentRows;
    const rotatedShape = Array(rotatedRows)
      .fill()
      .map(() => Array(rotatedCols).fill(0));

    for (let row = 0; row < currentRows; row++) {
      for (let col = 0; col < currentCols; col++) {
        rotatedShape[col][currentRows - 1 - row] = currentPiece.shape[row][col];
      }
    }

    return {
      shape: rotatedShape,
      color: currentPiece.color,
    };
  }, [currentPiece, gameOver]);

  /////// Initialize game
  const startGame = useCallback(() => {
    setGameStarted(false);
    setShowGameOverDialog(false);
    const startPosition = { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 };
    const newBoard = createEmptyBoard();
    const firstPiece = generateRandomPiece();
    const secondPiece = generateRandomPiece();

    if (checkGameOver(firstPiece, startPosition)) {
      setBoard(newBoard);
      setGameOver(true);
      setShowGameOverDialog(true);
      return;
    }

    setBoard(newBoard);
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setPosition(startPosition);
    setGameOver(false);
    setShowGameOverDialog(false);
    setScore(0);
    setGameStarted(true);

    const guidelines = calculateGuidelines(firstPiece, startPosition);
    setGuideLines(guidelines);
  }, [generateRandomPiece, checkGameOver, calculateGuidelines]);

  // Handle key presses
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (gameOver) {
        if (event.key === "Enter") {
          startGame();
        }
        return;
      }

      if (event.key === "Escape") {
        setGameStarted(false);
        setBoard(createEmptyBoard());
        setCurrentPiece(null);
        setNextPiece(null);
        setPosition({ x: 0, y: 0 });
        startButtonRef.current?.focus();
        return;
      }

      let currentY = position.y;
      const rotated = rotatePiece();

      switch (event.key) {
        case "ArrowLeft":
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          movePiece(1, 0);
          break;
        case "ArrowUp":
          if (rotated && !hasCollision(rotated, position)) {
            const guidelines = calculateGuidelines(rotated, position);
            setCurrentPiece(rotated);
            setGuideLines(guidelines);
          }
          break;
        case " " /* Space */:
          event.preventDefault();
          accelerateDrop();
          if (position.y !== currentY) {
            // Only lock if we actually moved
            movePiece(0, 1);
          }
          break;
        case "ArrowDown":
          movePiece(0, 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    gameStarted,
    gameOver,
    movePiece,
    accelerateDrop,
    rotatePiece,
    startGame,
    hasCollision,
    calculateGuidelines,
    position,
  ]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      movePiece(0, 1);
    }, 1500); // Game speed - the greater number the slower initial movement

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, movePiece]);

  // Render preview board
  const renderPreview = useCallback(() => {
    if (!nextPiece) return [];

    // Create a board just big enough for the piece
    const width = nextPiece.shape[0].length;
    const height = nextPiece.shape.length;
    const previewBoard = Array(height)
      .fill()
      .map(() => Array(width).fill(null));

    // Fill the board with just the piece
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (nextPiece.shape[y][x]) {
          previewBoard[y][x] = nextPiece.color;
        }
      }
    }

    return previewBoard;
  }, [nextPiece]);

  // Render game board
  const renderBoard = useCallback(() => {
    const displayBoard = board.map((row) => [...row]);

    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = position.y + y;
            const boardX = position.x + x;
            if (
              boardY >= 0 &&
              boardY < BOARD_HEIGHT &&
              boardX >= 0 &&
              boardX < BOARD_WIDTH
            ) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }

    return displayBoard;
  }, [board, currentPiece, position]);

  return (
    <div className="flex flex-col items-center p-4">
      {/* Hiding text cursor */}
      <style>{`
        .no-focus {
          outline: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
      <div className="flex gap-8">
        {/* Left column */}
        <div className="flex flex-col">
          <div className="border-2 border-gray-400 p-1 mb-1 flex justify-center items-center no-focus">
            <h1
              className="text-4xl font-bold no-focus"
              style={{
                color: "#002366",
                WebkitTextFillColor: "#002366",
              }}
            >
              TETRIS
            </h1>
          </div>
          <div className="border-2 border-gray-400 p-1 no-focus relative">
            <div className="grid grid-cols-10 gap-px bg-gray-200 no-focus">
              {renderBoard().map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="w-6 h-6 no-focus"
                    style={{ backgroundColor: cell || "white" }}
                  />
                ))
              )}

              {/* Draw guide lines */}
              {currentPiece &&
                guideLines.left >= 0 &&
                guideLines.stopY <= BOARD_HEIGHT && (
                  // {currentPiece && guideLines.left >= 0 && (
                  <>
                    {/* Left guide line */}
                    <div
                      className="absolute border-l-2 border-dashed"
                      style={{
                        position: "absolute",
                        left: `${guideLines.left * 24 + 7}px`,
                        top: `${(position.y + currentPiece.shape.length) * 24 + 12}px`, // Changed this line
                        height: `${Math.max(0, guideLines.stopY - (position.y + currentPiece.shape.length)) * 24}px`,
                        // height: `${(guideLines.stopY - (position.y + currentPiece.shape.length)) * 24}px`,
                        borderColor: "#00ffff",
                        zIndex: 10,
                      }}
                    />
                    {/* Right guide line */}
                    <div
                      className="absolute border-l-2 border-dashed"
                      style={{
                        position: "absolute",
                        left: `${(guideLines.right + 1) * 24 + 7}px`,
                        top: `${(position.y + currentPiece.shape.length) * 24 + 12}px`, // Changed this line
                        height: `${Math.max(0, guideLines.stopY - (position.y + currentPiece.shape.length)) * 24}px`,
                        // height: `${(guideLines.stopY - (position.y + currentPiece.shape.length)) * 24}px`,
                        borderColor: "#00ffff",
                        zIndex: 10,
                      }}
                    />
                  </>
                )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 w-50 items-center">
          {/* Score section */}
          <div className="border-2 border-gray-400 p-1 mb-1 w-full flex justify-center items-center no-focus">
            <div
              className="text-4xl font-bold no-focus"
              style={{ color: "#002366" }}
            >
              {score}
            </div>
          </div>

          {/* Preview section */}
          <div
            className="text-xl mb-2 text-center no-focus w-full"
            style={{ color: "#002366", fontWeight: "bold" }}
          >
            Next
          </div>
          <div
            className="border-2 border-gray-400 p-1 flex items-center justify-center no-focus w-full"
            style={{ height: "120px" }}
          >
            <div
              className="grid gap-px"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${nextPiece?.shape[0].length || 1}, 24px)`,
                gap: "1px",
                backgroundColor: "white",
              }}
            >
              {renderPreview().map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`preview-${y}-${x}`}
                    className="w-6 h-6"
                    style={{
                      backgroundColor: cell || "white",
                      width: "24px",
                      height: "24px",
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Controls section */}
          <div className="border-2 border-gray-400 p-2 w-full no-focus">
            <p
              className="text-xl mb-2 text-center no-focus"
              style={{ color: "#002366" }}
            >
              Controls
            </p>
            <ul className="no-focus">
              <li>← : Left</li>
              <li>→ : Right</li>
              <li>↑ : Rotate</li>
              <li>↓ : Accelerate drop</li>
              <li>Space : Instant drop</li>
              <li>ESC : Stop and play again</li>
            </ul>
          </div>

          {/* Start/Restart button */}
          <button
            ref={startButtonRef}
            onClick={startGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-auto w-full no-focus"
          >
            {gameStarted ? "Restart" : "Start"} Game
          </button>
        </div>
      </div>

      <GameOverDialog
        score={score}
        onRestart={() => {}}
        show={showGameOverDialog}
        setShowGameOverDialog={setShowGameOverDialog}
        setGameStarted={setGameStarted}
      />
    </div>
  );
};

GameOverDialog.propTypes = {
  score: PropTypes.number.isRequired,
  onRestart: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  setShowGameOverDialog: PropTypes.func.isRequired,
  setGameStarted: PropTypes.func.isRequired,
};

export default TetrisGame;
