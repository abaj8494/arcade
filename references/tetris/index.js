const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");

context.scale(20,20);

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
}

function arenaSweep() {
    let rowCount = 1;
    // controls which loop to continue! bahahah
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos]; //destructuring
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y+o.y][x+o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(width, height) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    let matrix;
    switch(type) {
        case 'T':
            matrix = [
                [0,0,0],
                [1,1,1],
                [0,1,0],
            ];
            break;
        case 'O':
            matrix = [
                [2,2],
                [2,2],
            ];
            break;
        case 'J':
            matrix = [
                [0,3,0],
                [0,3,0],
                [3,3,0],
            ];
            break;
        case 'S':
            matrix = [
                [0,4,4],
                [4,4,0],
                [0,0,0],
            ];
            break;
        case 'Z':
            matrix = [
                [5,5,0],
                [0,5,5],
                [0,0,0],
            ];
            break;
        case 'L':
            matrix = [
                [0,6,0],
                [0,6,0],
                [0,6,6],
            ];
            break;
        case 'I':
            matrix = [
                [0,7,0,0],
                [0,7,0,0],
                [0,7,0,0],
                [0,7,0,0],
            ];
            break;
    }
    return matrix;
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) =>{
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colours[value];
                context.fillRect(x + offset.x, 
                                 y + offset.y,
                                 1, 1);
            }
        })
    });
}


function merge(arena, player) {
    player.matrix.forEach((row, y) => {//forEach in js is like enumerate in Python
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        })
    })
}

function playerSpace() {
    while (player.pos.y != 0) {
        playerDrop();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                    (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + offset > 0 ? 1 : -1);
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return; 
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++ x) {
            [
                matrix[x][y],
                matrix[y][x]
            ] = [
                matrix[y][x],
                matrix[x][y]
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}


function draw() {
    context.fillStyle = '#000';
    context.fillRect(0,0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
let dropInterval = 1000; // milliseconds to drop

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

const colours = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
]

const arena = createMatrix(12, 20);

document.addEventListener('keydown', (event) => {
    // note that there are no parens after the case.
    // furthermore, STOP FORGETTING THE BREAK!!
    switch(event.key) {
        case 'ArrowLeft':
            playerMove(-1);
            break;
        case 'ArrowRight':
            playerMove(+1);
            break;
        case 'ArrowDown':
            playerDrop();
            break;
        case 'ArrowUp':
            playerRotate(-1);
            break;
        case ' ':
            playerSpace();
            break;
    }
})


playerReset();
updateScore();
update();
