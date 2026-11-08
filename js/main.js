// ===== Тетрис с Котиками ===
document.addEventListener('DOMContentLoaded', function () {
  var COLS = 10;
  var ROWS = 20;
  var BLOCK_SIZE = 30;
  var COLORS = [
    null,
    '#FF1493',
    '#9B30FF',
    '#FFD700',
    '#00E676',
    '#2979FF',
    '#FF1744',
    '#E040FB'
  ];
  var PIECES = [
    null,
    { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    { shape: [[1,0,0],[1,1,1],[0,0,0]] },
    { shape: [[0,0,1],[1,1,1],[0,0,0]] },
    { shape: [[1,1],[1,1]] },
    { shape: [[0,1,1],[1,1,0],[0,0,0]] },
    { shape: [[0,1,0],[1,1,1],[0,0,0]] },
    { shape: [[1,1,0],[0,1,1],[0,0,0]] }
  ];
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var nextCanvas = document.getElementById('nextCanvas');
  var nextCtx = nextCanvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var levelEl = document.getElementById('level');
  var linesEl = document.getElementById('lines');
  var overlay = document.getElementById('overlay');
  var overlayText = document.getElementById('overlayText');
  var playBtn = document.getElementById('playBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var board = [];
  var score = 0;
  var lines = 0;
  var level = 1;
  var gameOver = false;
  var paused = false;
  var running = false;
  var dropCounter = 0;
  var dropInterval = 1000;
  var lastTime = 0;
  var currentPiece = null;
  var nextPiece = null;
  var animId = null;

  function createBoard() {
    var result = [];
    for (var i = 0; i < ROWS; i++) {
      result.push(new Array(COLS).fill(0));
    }
    return result;
  }

  function createPiece() {
    var id = Math.floor(Math.random() * 7) + 1;
    var p = PIECES[id];
    var shape = [];
    for (var i = 0; i < p.shape.length; i++) {
      shape.push(p.shape[i].slice());
    }
    return {
      shape: shape,
      cat: p.cat,
      x: Math.floor(COLS / 2) - Math.ceil(p.shape[0].length / 2),
      y: 0,
      id: id
    };
  }

  function drawBlock(context, x, y, colorId, size) {
    var color = COLORS[colorId];
    // Эффект свечения
    context.shadowColor = color;
    context.shadowBlur = 8;
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size, size);
    context.shadowBlur = 0;
    // Блик
    context.fillStyle = 'rgba(255, 255, 255, 0.4)';
    context.fillRect(x * size, y * size, size, 3);
    context.fillRect(x * size, y * size, 3, size);
    // Тень
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.fillRect(x * size + size - 3, y * size, 3, size);
    context.fillRect(x * size, y * size + size - 3, size, 3);
    // Обводка
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 1;
    context.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
  }

  function drawPiece(context, piece, offsetX, offsetY, size) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    size = size || BLOCK_SIZE;
    for (var y = 0; y < piece.shape.length; y++) {
      for (var x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, piece.id, size);
        }
      }
    }
  }

  function drawBoard() {
    ctx.fillStyle = '#fdf2f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.08)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * BLOCK_SIZE, 0);
      ctx.lineTo(i * BLOCK_SIZE, canvas.height);
      ctx.stroke();
    }
    for (var i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * BLOCK_SIZE);
      ctx.lineTo(canvas.width, i * BLOCK_SIZE);
      ctx.stroke();
    }
    for (var y = 0; y < board.length; y++) {
      for (var x = 0; x < board[y].length; x++) {
        if (board[y][x]) {
          drawBlock(ctx, x, y, board[y][x], BLOCK_SIZE);
        }
      }
    }
  }

  function drawNext() {
    nextCtx.fillStyle = '#fdf2f8';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    var shape = nextPiece.shape;
    var offsetX = (4 - shape[0].length) / 2;
    var offsetY = (4 - shape.length) / 2;
    for (var y = 0; y < shape.length; y++) {
      for (var x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          drawBlock(nextCtx, x + offsetX, y + offsetY, nextPiece.id, 30);
        }
      }
    }
  }

  function collide(board, piece) {
    for (var y = 0; y < piece.shape.length; y++) {
      for (var x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          var boardX = piece.x + x;
          var boardY = piece.y + y;
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return true;
          }
          if (boardY >= 0 && board[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function merge(board, piece) {
    for (var y = 0; y < piece.shape.length; y++) {
      for (var x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          var boardY = piece.y + y;
          var boardX = piece.x + x;
          if (boardY >= 0) {
            board[boardY][boardX] = piece.id;
          }
        }
      }
    }
  }

  function rotate(piece) {
    var rotated = [];
    for (var i = 0; i < piece.shape[0].length; i++) {
      var row = [];
      for (var j = piece.shape.length - 1; j >= 0; j--) {
        row.push(piece.shape[j][i]);
      }
      rotated.push(row);
    }
    var prevShape = piece.shape;
    piece.shape = rotated;
    var kicks = [0, -1, 1, -2, 2];
    var kicked = false;
    for (var k = 0; k < kicks.length; k++) {
      piece.x += kicks[k];
      if (!collide(board, piece)) {
        kicked = true;
        break;
      }
      piece.x -= kicks[k];
    }
    if (!kicked) {
      piece.shape = prevShape;
    }
  }

  function clearLines() {
    var linesCleared = 0;
    for (var y = ROWS - 1; y >= 0; y--) {
      var full = true;
      for (var x = 0; x < COLS; x++) {
        if (board[y][x] === 0) {
          full = false;
          break;
        }
      }
      if (full) {
        board.splice(y, 1);
        board.unshift(new Array(COLS).fill(0));
        linesCleared++;
        y++;
      }
    }
    if (linesCleared > 0) {
      var points = [0, 100, 300, 500, 800];
      score += points[linesCleared] * level;
      lines += linesCleared;
      level = Math.floor(lines / 5) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      updateUI();
    }
  }

  function updateUI() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }

  function spawnPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    if (collide(board, currentPiece)) {
      endGame();
    }
    drawNext();
  }

  function endGame() {
    gameOver = true;
    running = false;
    overlay.classList.remove('hidden');
    overlayText.textContent = 'Game Over! Score: ' + score + '. Click Play';
    playBtn.textContent = 'Restart';
  }

  function hardDrop() {
    while (!collide(board, { shape: currentPiece.shape, x: currentPiece.x, y: currentPiece.y + 1, id: currentPiece.id, cat: currentPiece.cat })) {
      currentPiece.y++;
    }
    lockPiece();
  }

  function lockPiece() {
    merge(board, currentPiece);
    clearLines();
    spawnPiece();
  }

  function update(time) {
    time = time || 0;
    if (!running || paused || gameOver) return;
    var deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      currentPiece.y++;
      if (collide(board, currentPiece)) {
        currentPiece.y--;
        lockPiece();
      }
      dropCounter = 0;
    }
    drawBoard();
    drawPiece(ctx, currentPiece);
    animId = requestAnimationFrame(update);
  }

  function startGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    paused = false;
    running = true;
    dropCounter = 0;
    dropInterval = 1000;
    lastTime = 0;
    updateUI();
    overlay.classList.add('hidden');
    playBtn.textContent = 'Play';
    nextPiece = createPiece();
    spawnPiece();
    update();
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) {
      overlay.classList.remove('hidden');
      overlayText.textContent = 'Paused';
    } else {
      overlay.classList.add('hidden');
      lastTime = performance.now();
      update();
    }
  }

  document.addEventListener('keydown', function (e) {
    if (!running || gameOver || paused) return;
    switch (e.key) {
      case 'ArrowLeft':
        currentPiece.x--;
        if (collide(board, currentPiece)) currentPiece.x++;
        break;
      case 'ArrowRight':
        currentPiece.x++;
        if (collide(board, currentPiece)) currentPiece.x--;
        break;
      case 'ArrowDown':
        currentPiece.y++;
        if (collide(board, currentPiece)) {
          currentPiece.y--;
          lockPiece();
        }
        dropCounter = 0;
        break;
      case 'ArrowUp':
        rotate(currentPiece);
        break;
      case ' ':
        e.preventDefault();
        hardDrop();
        break;
      case 'p':
      case 'P':
      case 'Escape':
        togglePause();
        break;
    }
    if (!paused && !gameOver) {
      drawBoard();
      drawPiece(ctx, currentPiece);
    }
  });

  function setupMobileButton(id, action) {
    var btn = document.getElementById(id);
    if (!btn) return;
    var handler = function (e) {
      e.preventDefault();
      if (!running || gameOver || paused) return;
      action();
      drawBoard();
      drawPiece(ctx, currentPiece);
    };
    btn.addEventListener('touchstart', handler);
    btn.addEventListener('mousedown', handler);
  }

  setupMobileButton('btnLeft', function () {
    currentPiece.x--;
    if (collide(board, currentPiece)) currentPiece.x++;
  });
  setupMobileButton('btnRight', function () {
    currentPiece.x++;
    if (collide(board, currentPiece)) currentPiece.x--;
  });
  setupMobileButton('btnDown', function () {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
      currentPiece.y--;
      lockPiece();
    } else {
      dropCounter = 0;
    }
  });
  setupMobileButton('btnRotate', function () {
    rotate(currentPiece);
  });
  setupMobileButton('btnDrop', function () {
    hardDrop();
  });

  playBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);

  board = createBoard();
  drawBoard();
  drawNext();
});