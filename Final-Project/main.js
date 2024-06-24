import DinoGame from './game/DinoGame.js'

const game = new DinoGame(600, 150)
const isTouchDevice =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0

if (isTouchDevice) {
  document.addEventListener('touchstart', ({ touches }) => {
    if (touches.length === 1) {
      game.onInput('jump')
    } else if (touches.length === 2) {
      game.onInput('duck')
    }
  })

  document.addEventListener('touchend', ({ touches }) => {
    game.onInput('stop-duck')
  })
} else {
  const keycodes = {
    // up, spacebar
    JUMP: { 38: 1, 32: 1 },
    // down
    DUCK: { 40: 1 },
  }

  document.addEventListener('keydown', ({ keyCode }) => {
    if (keycodes.JUMP[keyCode]) {
      game.onInput('jump')
    } else if (keycodes.DUCK[keyCode]) {
      game.onInput('duck')
    }
  })

  document.addEventListener('keyup', ({ keyCode }) => {
    if (keycodes.DUCK[keyCode]) {
      game.onInput('stop-duck')
    }
  })
}

game.start().catch(console.error)

const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = new AudioContext()
const soundNames = ['game-over', 'jump', 'level-up']
const soundBuffers = {}
let SOUNDS_LOADED = false

loadSounds().catch(console.error)
export function playSound(name) {
  if (SOUNDS_LOADED) {
    audioContext.resume()
    playBuffer(soundBuffers[name])
  }
}

async function loadSounds() {
  await Promise.all(
    soundNames.map(async (soundName) => {
      soundBuffers[soundName] = await loadBuffer(`./assets/${soundName}.mp3`)
    })
  )

  SOUNDS_LOADED = true
}

function loadBuffer(filepath) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('GET', filepath)
    request.responseType = 'arraybuffer'
    request.onload = () =>
      audioContext.decodeAudioData(request.response, resolve)
    request.onerror = reject
    request.send()
  })
}

function playBuffer(buffer) {
  const source = audioContext.createBufferSource()

  source.buffer = buffer
  source.connect(audioContext.destination)
  source.start()
}

export default {
  birdUp: { h: 52, w: 84, x: 708, y: 31 },
  birdDown: { h: 60, w: 84, x: 708, y: 85 },
  cactus: { h: 92, w: 46, x: 70, y: 31 },
  cactusDouble: { h: 66, w: 64, x: 118, y: 31 },
  cactusDoubleB: { h: 92, w: 80, x: 184, y: 31 },
  cactusTriple: { h: 66, w: 82, x: 266, y: 31 },
  cloud: { h: 28, w: 92, x: 794, y: 31 },
  dino: { h: 86, w: 80, x: 350, y: 31 },
  dinoDuckLeftLeg: { h: 52, w: 110, x: 596, y: 31 },
  dinoDuckRightLeg: { h: 52, w: 110, x: 596, y: 85 },
  dinoLeftLeg: { h: 86, w: 80, x: 432, y: 31 },
  dinoRightLeg: { h: 86, w: 80, x: 514, y: 31 },
  ground: { h: 28, w: 2400, x: 0, y: 2 },
  replayIcon: { h: 60, w: 68, x: 0, y: 31 },
}

export function getImageData(image) {
  const { width, height } = image
  const tmpCanvas = document.createElement('canvas')
  const ctx = tmpCanvas.getContext('2d')
  let result

  tmpCanvas.width = width
  tmpCanvas.height = height
  ctx.drawImage(image, 0, 0)

  result = ctx.getImageData(0, 0, width, height)
  tmpCanvas.remove()
  return result
}

export async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function getFontName(url) {
  const ext = url.slice(url.lastIndexOf('.'))
  const pathParts = url.split('/')

  return pathParts[pathParts.length - 1].slice(0, -1 * ext.length)
}

export async function loadFont(url, fontName) {
  if (!fontName) fontName = getFontName(url)
  const styleEl = document.createElement('style')

  styleEl.innerHTML = `
    @font-face {
      font-family: ${fontName};
      src: url(${url});
    }
  `
  document.head.appendChild(styleEl)
  await document.fonts.load(`12px ${fontName}`)
}

export function randInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randBoolean() {
  return Boolean(randInteger(0, 1))
}

export function randItem(arr) {
  return arr[randInteger(0, arr.length - 1)]
}
