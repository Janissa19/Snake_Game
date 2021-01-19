// Hier definiere ich wichitge Functions, um die Weiterarbeit für später zu vereinfachen

const adjust    = n => f => xs => mapi(x => i => i == n ? f(x) : x)(xs)
const dropFirst = xs => xs.slice(1)
const dropLast  = xs => xs.slice(0, xs.length - 1)
const id        = x => x
const k         = x => y => x
const map       = f => xs => xs.map(f)
const mapi      = f => xs => xs.map((x, i) => f(x)(i))
const merge     = o1 => o2 => Object.assign({}, o1, o2)
const mod       = x => y => ((y % x) + x) % x 
const objOf     = k => v => ({ [k]: v })
const pipe      = (...fns) => x => [...fns].reduce((acc, f) => f(acc), x)
const prop      = k => o => o[k]
const range     = n => m => Array.apply(null, Array(m - n)).map((_, i) => n + i)
const rep       = c => n => map(k(c))(range(0)(n))
const rnd       = min => max => Math.floor(Math.random() * max) + min
const spec      = o => x => Object.keys(o)
  .map(k => objOf(k)(o[k](x)))
  .reduce((acc, o) => Object.assign(acc, o))

  // Mit hilfe dessen, kann ich functions für andere Orte im file erreichbar machen.
module.exports = { adjust, dropFirst, dropLast, id, k, map, merge, mod, objOf, pipe, prop, range, rep, rnd, spec }

const base = require('./base')
Object.getOwnPropertyNames(base).map(p => global[p] = base[p])

// Damit ich weiter unten einfache Wörter benutzen kann, anstatt die Koordinaten
// Habe ich die hier genauer definiert. Dank des Koordinatensystem der canvas.
const NORTH = { x: 0, y:-1 }
const SOUTH = { x: 0, y: 1 }
const EAST  = { x: 1, y: 0 }
const WEST  = { x:-1, y: 0 }


const pointEq = p1 => p2 => p1.x == p2.x && p1.y == p2.y

// Hier stelle ich fragen, was geschieht wenn die Schlange isst oder umfällt, etc.
// Und wie sie sich dann bewegt und/oder verhaltet.
// Validmove, sie müssen unterschiedlich sein, damit ich auf 0 komme.
const willEat   = state => pointEq(nextHead(state))(state.apple)
const willCrash = state => state.snake.find(pointEq(nextHead(state)))
const validMove = move => state =>
  state.moves[0].x + move.x != 0 || state.moves[0].y + move.y != 0

// Next values basierend auf den states für die Bewegung, die Schlange (Den Kopf), die Schlange (den Körper) und die Äpfel
const nextMoves = state => state.moves.length > 1 ? dropFirst(state.moves) : state.moves
const nextApple = state => willEat(state) ? rndPos(state) : state.apple
const nextHead  = state => state.snake.length == 0
  ? { x: 2, y: 2 }
  : {
    x: mod(state.cols)(state.snake[0].x + state.moves[0].x),
    y: mod(state.rows)(state.snake[0].y + state.moves[0].y)
  }
const nextSnake = state => willCrash(state)
  ? []
  : (willEat(state)
    ? [nextHead(state)].concat(state.snake)
    : [nextHead(state)].concat(dropLast(state.snake)))

// Das ist eine Hilfe, das Game random zu gestalten.
const rndPos = table => ({
  x: rnd(0)(table.cols - 1),
  y: rnd(0)(table.rows - 1)
})

// Beim Starten des Spiels, startet die Schlange immer beim gleichen Ort und geht immer nach rechts.
// So auch der Apfel. Die Randomness kommt später dazu.
const initialState = () => ({
  cols:  20,
  rows:  14,
  moves: [EAST],
  snake: [],
  apple: { x: 16, y: 2 },
})

const next = spec({
  rows:  prop('rows'),
  cols:  prop('cols'),
  moves: nextMoves,
  snake: nextSnake,
  apple: nextApple
})

// Damit wenn man in die Gegenrichtung steuert, das Spiel nicht sofort beendet ist. Wenn die 
// moves richitg sind, ist es normal weiter, aber wir ignorieren es, wenn es in die entgegen gesetzte Richtung geht.
const enqueue = (state, move) => validMove(move)(state)
  ? merge(state)({ moves: state.moves.concat([move]) })
  : state


module.exports = { EAST, NORTH, SOUTH, WEST, initialState, enqueue, next, }

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

//  Einfach ausgedrückt, wenn wir ein Spiel beginnen wollen, brauchen wir einen initialState. Der Startschuss in dem Sinn.
let state = initialState()

// Position helpers
const x = c => Math.round(c * canvas.width / state.cols)
const y = r => Math.round(r * canvas.height / state.rows)

// Was genau ist dieses draw? 
const draw = () => {
  // zuerst clearen wir die canvas; Es erstell ein Rechteck
  ctx.fillStyle = '#232323'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Das Design der Schlange und wie genau sie sich bewegen kann.
  ctx.fillStyle = 'rgb(74,56,56)'
  state.snake.map(p => ctx.fillRect(x(p.x), y(p.y), x(1), y(1)))

  // Das Design der Äpfel
  ctx.fillStyle = 'rgb(255,50,0)'
  ctx.fillRect(x(state.apple.x), y(state.apple.y), x(1), y(1))

  // Wenn das Spiel neuladet oder es einen Unfall gibt.
  // Wenn wir keine Schlange haben, soll es einen kleinen Aufblitz geben.
  if (state.snake.length == 0) {
    ctx.fillStyle = 'rgb(255,211,155)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

// Definition der function step von draw(); window.requestAnimationFrame(step(0)). t1= timeline1; t2= timeline2
const step = t1 => t2 => {
  if (t2 - t1 > 100) {
    state = next(state)
    draw()
    window.requestAnimationFrame(step(t2))
  } else {
    window.requestAnimationFrame(step(t1)) //Damit wir das Spiel auch neuladen können, muss hier logischerwiese die andere Timeline stehen. Für das auch zwei denn
    // ohne die Unterschiede gäbe es keinen Loop in dem Sinn.
  }
}

// Damit wir die Schlange mit den Pfeiltasten oder w,a,s,d-Kombi steuern können, brauchen wir folgende case
// Norden, Süden, Osten und Westen wurden in diesem File spezifiziert. Weiter oben, mehr dazu.
// enqueue wurde auch genauer definiert. 
window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'w': case 'ArrowUp':    state = enqueue(state, NORTH); break
    case 'a': case 'ArrowLeft':  state = enqueue(state, WEST);  break
    case 's': case 'ArrowDown':  state = enqueue(state, SOUTH); break
    case 'd': case 'ArrowRight': state = enqueue(state, EAST);  break
  }
})

// Haupteingabe um den Loop zu gewähren, dass wenn wir sterben ein neues Spiel bei einem neuen Startpunkt startet.
draw(); window.requestAnimationFrame(step(0))
