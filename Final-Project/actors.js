import sprites from '../sprites.js'

const cache = new Map()

// analyze the pixels and create a map of the transparent
// and non-transparent pixels for hit testing
function getSpriteAlphaMap(imageData, name) {
  if (cache.has(name)) {
    return cache.get(name)
  }

  const sprite = sprites[name]
  const lines = []
  const initIVal = imageData.width * sprite.y * 4

  // for each line of pixels
  for (
    let i = initIVal;
    i < initIVal + sprite.h * imageData.width * 4;
    // (increments by 8 because it skips every other pixel due to pixel density)
    i += imageData.width * 8
  ) {
    const line = []
    const initJVal = i + sprite.x * 4
    // for each pixel in the line
    // (increments by 8 because it skips every other pixel due to pixel density)
    for (let j = initJVal; j < initJVal + sprite.w * 4; j += 8) {
      // 0 for transparent, 1 for not
      line.push(imageData.data[j + 3] === 0 ? 0 : 1)
    }

    lines.push(line)
  }

  cache.set(name, lines)
  return lines
}

export default class Actor {
  constructor(imageData) {
    this._sprite = null
    this.height = 0
    this.width = 0
    this.x = 0
    this.y = 0

    // the spriteImage should only be passed into actors that will
    // use hit detection; otherwise don't waste cpu on generating
    // the alpha map every time the sprite is set
    if (imageData) {
      this.imageData = imageData
      this.alphaMap = []
    }
  }

  set sprite(name) {
    this._sprite = name
    this.height = sprites[name].h / 2
    this.width = sprites[name].w / 2

    if (this.imageData) {
      this.alphaMap = getSpriteAlphaMap(this.imageData, name)
    }
  }

  get sprite() {
    return this._sprite
  }

  // the x value of the right side of it
  get rightX() {
    return this.width + this.x
  }

  // the y value of the bottom of it
  get bottomY() {
    return this.height + this.y
  }

  hits(actors) {
    return actors.some((actor) => {
      if (!actor) return false

      if (this.x >= actor.rightX || actor.x >= this.rightX) {
        return false
      }

      if (this.y >= actor.bottomY || actor.y >= this.bottomY) {
        return false
      }

      // actors' coords are intersecting, but they still might not be hitting
      // each other if they intersect at transparent pixels
      if (this.alphaMap && actor.alphaMap) {
        const startY = Math.round(Math.max(this.y, actor.y))
        const endY = Math.round(Math.min(this.bottomY, actor.bottomY))
        const startX = Math.round(Math.max(this.x, actor.x))
        const endX = Math.round(Math.min(this.rightX, actor.rightX))
        const thisY = Math.round(this.y)
        const actorY = Math.round(actor.y)
        const thisX = Math.round(this.x)
        const actorX = Math.round(actor.x)

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            // doesn't hit if either are transparent at these coords
            if (this.alphaMap[y - thisY][x - thisX] === 0) continue
            if (actor.alphaMap[y - actorY][x - actorX] === 0) continue

            return true
          }
        }

        return false
      }

      return true
    })
  }
}

import sprites from '../sprites.js'
import Actor from './Actor.js'

export default class Bird extends Actor {
  static maxBirdHeight = Math.max(sprites.birdUp.h, sprites.birdDown.h) / 2

  // pixels that are added/removed to `y` when switching between wings up and wings down
  static wingSpriteYShift = 6

  constructor(imageData) {
    super(imageData)
    this.wingFrames = 0
    this.wingDirection = 'Up'
    this.sprite = `bird${this.wingDirection}`
    // these are dynamically set by the game
    this.x = null
    this.y = null
    this.speed = null
    this.wingsRate = null
  }

  nextFrame() {
    this.x -= this.speed
    this.determineSprite()
  }

  determineSprite() {
    const oldHeight = this.height

    if (this.wingFrames >= this.wingsRate) {
      this.wingDirection = this.wingDirection === 'Up' ? 'Down' : 'Up'
      this.wingFrames = 0
    }

    this.sprite = `bird${this.wingDirection}`
    this.wingFrames++

    // if we're switching sprites, y needs to be
    // updated for the height difference
    if (this.height !== oldHeight) {
      let adjustment = Bird.wingSpriteYShift
      if (this.wingDirection === 'Up') {
        adjustment *= -1
      }

      this.y += adjustment
    }
  }
}

import { randItem } from '../utils.js'
import Actor from './Actor.js'

const VARIANTS = ['cactus', 'cactusDouble', 'cactusDoubleB', 'cactusTriple']

export default class Cactus extends Actor {
  constructor(imageData) {
    super(imageData)
    this.sprite = randItem(VARIANTS)
    // these are dynamically set by the game
    this.speed = null
    this.x = null
    this.y = null
  }

  nextFrame() {
    this.x -= this.speed
  }
}

import { randInteger } from '../utils.js'
import Actor from './Actor.js'

export default class Cloud extends Actor {
  constructor(canvasWidth) {
    super()
    this.sprite = 'cloud'
    this.speedMod = randInteger(6, 14) / 10
    // these are dynamically set by the game
    this.speed = null
    this.x = null
    this.y = null
  }

  nextFrame() {
    this.x -= this.speed * this.speedMod
  }
}

import Actor from './Actor.js'

export default class Dino extends Actor {
  constructor(imageData) {
    super(imageData)
    this.isDucking = false
    this.legFrames = 0
    this.legShowing = 'Left'
    this.sprite = `dino${this.legShowing}Leg`
    this.vVelocity = null
    this.baseY = 0
    this.relativeY = 0
    // these are dynamically set by the game
    this.legsRate = null
    this.lift = null
    this.gravity = null
  }

  get y() {
    return this.baseY - this.height + this.relativeY
  }

  set y(value) {
    this.baseY = value
  }

  reset() {
    this.isDucking = false
    this.legFrames = 0
    this.legShowing = 'Left'
    this.sprite = `dino${this.legShowing}Leg`
    this.vVelocity = null
    this.relativeY = 0
  }

  jump() {
    if (this.relativeY === 0) {
      this.vVelocity = -this.lift
      return true
    }
    return false
  }

  duck(value) {
    this.isDucking = Boolean(value)
  }

  nextFrame() {
    if (this.vVelocity !== null) {
      // use gravity to gradually decrease vVelocity
      this.vVelocity += this.gravity
      this.relativeY += this.vVelocity
    }

    // stop falling once back down to the ground
    if (this.relativeY > 0) {
      this.vVelocity = null
      this.relativeY = 0
    }

    this.determineSprite()
  }

  determineSprite() {
    if (this.relativeY < 0) {
      // in the air stiff
      this.sprite = 'dino'
    } else {
      // on the ground running
      if (this.legFrames >= this.legsRate) {
        this.legShowing = this.legShowing === 'Left' ? 'Right' : 'Left'
        this.legFrames = 0
      }

      if (this.isDucking) {
        this.sprite = `dinoDuck${this.legShowing}Leg`
      } else {
        this.sprite = `dino${this.legShowing}Leg`
      }

      this.legFrames++
    }
  }
}

import Bird from '../actors/Bird.js'
import Cactus from '../actors/Cactus.js'
import Cloud from '../actors/Cloud.js'
import Dino from '../actors/Dino.js'
import sprites from '../sprites.js'
import { playSound } from '../sounds.js'
import {
  loadFont,
  loadImage,
  getImageData,
  randBoolean,
  randInteger,
} from '../utils.js'
import GameRunner from './GameRunner.js'

export default class DinoGame extends GameRunner {
  constructor(width, height) {
    super()

    this.width = null
    this.height = null
    this.canvas = this.createCanvas(width, height)
    this.canvasCtx = this.canvas.getContext('2d')
    this.spriteImage = null
    this.spriteImageData = null

    /*
     * units
     * fpa: frames per action
     * ppf: pixels per frame
     * px: pixels
     */
    this.defaultSettings = {
      bgSpeed: 8, // ppf
      birdSpeed: 7.2, // ppf
      birdSpawnRate: 240, // fpa
      birdWingsRate: 15, // fpa
      cactiSpawnRate: 50, // fpa
      cloudSpawnRate: 200, // fpa
      cloudSpeed: 2, // ppf
      dinoGravity: 0.5, // ppf
      dinoGroundOffset: 4, // px
      dinoLegsRate: 6, // fpa
      dinoLift: 10, // ppf
      scoreBlinkRate: 20, // fpa
      scoreIncreaseRate: 6, // fpa
    }

    this.state = {
      settings: { ...this.defaultSettings },
      birds: [],
      cacti: [],
      clouds: [],
      dino: null,
      gameOver: false,
      groundX: 0,
      groundY: 0,
      isRunning: false,
      level: 0,
      score: {
        blinkFrames: 0,
        blinks: 0,
        isBlinking: false,
        value: 0,
      },
    }
  }

  // ref for canvas pixel density:
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#correcting_resolution_in_a_%3Ccanvas%3E
  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const scale = window.devicePixelRatio

    this.width = width
    this.height = height
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    canvas.width = Math.floor(width * scale)
    canvas.height = Math.floor(height * scale)
    ctx.scale(scale, scale)

    document.body.appendChild(canvas)
    return canvas
  }

  async preload() {
    const { settings } = this.state
    const [spriteImage] = await Promise.all([
      loadImage('./assets/sprite.png'),
      loadFont('./assets/PressStart2P-Regular.ttf', 'PressStart2P'),
    ])
    this.spriteImage = spriteImage
    this.spriteImageData = getImageData(spriteImage)
    const dino = new Dino(this.spriteImageData)

    dino.legsRate = settings.dinoLegsRate
    dino.lift = settings.dinoLift
    dino.gravity = settings.dinoGravity
    dino.x = 25
    dino.baseY = this.height - settings.dinoGroundOffset
    this.state.dino = dino
    this.state.groundY = this.height - sprites.ground.h / 2
  }

  onFrame() {
    const { state } = this

    this.drawBackground()
    // this.drawFPS()
    this.drawGround()
    this.drawClouds()
    this.drawDino()
    this.drawScore()

    if (state.isRunning) {
      this.drawCacti()

      if (state.level > 3) {
        this.drawBirds()
      }

      if (state.dino.hits([state.cacti[0], state.birds[0]])) {
        playSound('game-over')
        state.gameOver = true
      }

      if (state.gameOver) {
        this.endGame()
      } else {
        this.updateScore()
      }
    }
  }

  onInput(type) {
    const { state } = this

    switch (type) {
      case 'jump': {
        if (state.isRunning) {
          if (state.dino.jump()) {
            playSound('jump')
          }
        } else {
          this.resetGame()
          state.dino.jump()
          playSound('jump')
        }
        break
      }

      case 'duck': {
        if (state.isRunning) {
          state.dino.duck(true)
        }
        break
      }

      case 'stop-duck': {
        if (state.isRunning) {
          state.dino.duck(false)
        }
        break
      }
    }
  }

  resetGame() {
    this.state.dino.reset()
    Object.assign(this.state, {
      settings: { ...this.defaultSettings },
      birds: [],
      cacti: [],
      gameOver: false,
      isRunning: true,
      level: 0,
      score: {
        blinkFrames: 0,
        blinks: 0,
        isBlinking: false,
        value: 0,
      },
    })

    this.start()
  }

  endGame() {
    const iconSprite = sprites.replayIcon
    const padding = 15

    this.paintText(
      'G A M E  O V E R',
      this.width / 2,
      this.height / 2 - padding,
      {
        font: 'PressStart2P',
        size: '12px',
        align: 'center',
        baseline: 'bottom',
        color: '#535353',
      }
    )

    this.paintSprite(
      'replayIcon',
      this.width / 2 - iconSprite.w / 4,
      this.height / 2 - iconSprite.h / 4 + padding
    )

    this.state.isRunning = false
    this.drawScore()
    this.stop()
  }

  increaseDifficulty() {
    const { birds, cacti, clouds, dino, settings } = this.state
    const { bgSpeed, cactiSpawnRate, dinoLegsRate } = settings
    const { level } = this.state

    if (level > 4 && level < 8) {
      settings.bgSpeed++
      settings.birdSpeed = settings.bgSpeed * 0.8
    } else if (level > 7) {
      settings.bgSpeed = Math.ceil(bgSpeed * 1.1)
      settings.birdSpeed = settings.bgSpeed * 0.9
      settings.cactiSpawnRate = Math.floor(cactiSpawnRate * 0.98)

      if (level > 7 && level % 2 === 0 && dinoLegsRate > 3) {
        settings.dinoLegsRate--
      }
    }

    for (const bird of birds) {
      bird.speed = settings.birdSpeed
    }

    for (const cactus of cacti) {
      cactus.speed = settings.bgSpeed
    }

    for (const cloud of clouds) {
      cloud.speed = settings.bgSpeed
    }

    dino.legsRate = settings.dinoLegsRate
  }

  updateScore() {
    const { state } = this

    if (this.frameCount % state.settings.scoreIncreaseRate === 0) {
      const oldLevel = state.level

      state.score.value++
      state.level = Math.floor(state.score.value / 100)

      if (state.level !== oldLevel) {
        playSound('level-up')
        this.increaseDifficulty()
        state.score.isBlinking = true
      }
    }
  }

  drawFPS() {
    this.paintText('fps: ' + Math.round(this.frameRate), 0, 0, {
      font: 'PressStart2P',
      size: '12px',
      baseline: 'top',
      align: 'left',
      color: '#535353',
    })
  }

  drawBackground() {
    this.canvasCtx.fillStyle = '#f7f7f7'
    this.canvasCtx.fillRect(0, 0, this.width, this.height)
  }

  drawGround() {
    const { state } = this
    const { bgSpeed } = state.settings
    const groundImgWidth = sprites.ground.w / 2

    this.paintSprite('ground', state.groundX, state.groundY)
    state.groundX -= bgSpeed

    // append second image until first is fully translated
    if (state.groundX <= -groundImgWidth + this.width) {
      this.paintSprite('ground', state.groundX + groundImgWidth, state.groundY)

      if (state.groundX <= -groundImgWidth) {
        state.groundX = -bgSpeed
      }
    }
  }

  drawClouds() {
    const { clouds, settings } = this.state

    this.progressInstances(clouds)
    if (this.frameCount % settings.cloudSpawnRate === 0) {
      const newCloud = new Cloud()
      newCloud.speed = settings.bgSpeed
      newCloud.x = this.width
      newCloud.y = randInteger(20, 80)
      clouds.push(newCloud)
    }
    this.paintInstances(clouds)
  }

  drawDino() {
    const { dino } = this.state

    dino.nextFrame()
    this.paintSprite(dino.sprite, dino.x, dino.y)
  }

  drawCacti() {
    const { state } = this
    const { cacti, settings } = state

    this.progressInstances(cacti)
    if (this.frameCount % settings.cactiSpawnRate === 0) {
      // randomly either do or don't add cactus
      if (!state.birds.length && randBoolean()) {
        const newCacti = new Cactus(this.spriteImageData)
        newCacti.speed = settings.bgSpeed
        newCacti.x = this.width
        newCacti.y = this.height - newCacti.height - 2
        cacti.push(newCacti)
      }
    }
    this.paintInstances(cacti)
  }

  drawBirds() {
    const { birds, settings } = this.state

    this.progressInstances(birds)
    if (this.frameCount % settings.birdSpawnRate === 0) {
      // randomly either do or don't add bird
      if (randBoolean()) {
        const newBird = new Bird(this.spriteImageData)
        newBird.speed = settings.birdSpeed
        newBird.wingsRate = settings.birdWingsRate
        newBird.x = this.width
        // ensure birds are always at least 5px higher than a ducking dino
        newBird.y =
          this.height -
          Bird.maxBirdHeight -
          Bird.wingSpriteYShift -
          5 -
          sprites.dinoDuckLeftLeg.h / 2 -
          settings.dinoGroundOffset
        birds.push(newBird)
      }
    }
    this.paintInstances(birds)
  }

  drawScore() {
    const { canvasCtx, state } = this
    const { isRunning, score, settings } = state
    const fontSize = 12
    let shouldDraw = true
    let drawValue = score.value

    if (isRunning && score.isBlinking) {
      score.blinkFrames++

      if (score.blinkFrames % settings.scoreBlinkRate === 0) {
        score.blinks++
      }

      if (score.blinks > 7) {
        score.blinkFrames = 0
        score.blinks = 0
        score.isBlinking = false
      } else {
        if (score.blinks % 2 === 0) {
          drawValue = Math.floor(drawValue / 100) * 100
        } else {
          shouldDraw = false
        }
      }
    }

    if (shouldDraw) {
      // draw the background behind it in case this is called
      // at a time where the background isn't re-drawn (i.e. in `endGame`)
      canvasCtx.fillStyle = '#f7f7f7'
      canvasCtx.fillRect(this.width - fontSize * 5, 0, fontSize * 5, fontSize)

      this.paintText((drawValue + '').padStart(5, '0'), this.width, 0, {
        font: 'PressStart2P',
        size: `${fontSize}px`,
        align: 'right',
        baseline: 'top',
        color: '#535353',
      })
    }
  }

  /**
   * For each instance in the provided array, calculate the next
   * frame and remove any that are no longer visible
   * @param {Actor[]} instances
   */
  progressInstances(instances) {
    for (let i = instances.length - 1; i >= 0; i--) {
      const instance = instances[i]

      instance.nextFrame()
      if (instance.rightX <= 0) {
        // remove if off screen
        instances.splice(i, 1)
      }
    }
  }

  /**
   * @param {Actor[]} instances
   */
  paintInstances(instances) {
    for (const instance of instances) {
      this.paintSprite(instance.sprite, instance.x, instance.y)
    }
  }

  paintSprite(spriteName, dx, dy) {
    const { h, w, x, y } = sprites[spriteName]
    this.canvasCtx.drawImage(this.spriteImage, x, y, w, h, dx, dy, w / 2, h / 2)
  }

  paintText(text, x, y, opts) {
    const { font = 'serif', size = '12px' } = opts
    const { canvasCtx } = this

    canvasCtx.font = `${size} ${font}`
    if (opts.align) canvasCtx.textAlign = opts.align
    if (opts.baseline) canvasCtx.textBaseline = opts.baseline
    if (opts.color) canvasCtx.fillStyle = opts.color
    canvasCtx.fillText(text, x, y)
  }
}

export default class GameRunner {
  constructor() {
    this.looping = false
    this.preloaded = false
    this.targetFrameRate = 60
    this.frameCount = 0
    this.frameRate = 0
    this.paused = false
    this.stepFrames = null
    this._lastFrameTime = window.performance.now()

    // store this bound function so we don't have to create
    // one every single time we call requestAnimationFrame
    this.__loop = this._loop.bind(this)
  }

  async start(paused = false) {
    if (!this.preloaded) {
      if (this.preload) {
        await this.preload()
      }
      this.preloaded = true
    }

    if (paused) {
      this.paused = paused
    }

    this.looping = true

    if (!paused) {
      window.requestAnimationFrame(this.__loop)
    }
  }

  stop() {
    this.looping = false
  }

  pause() {
    this.paused = true
  }

  unpause() {
    this.paused = false
  }

  step(frames = 1) {
    if (typeof this.stepFrames === 'number') {
      this.stepFrames += frames
    } else {
      this.stepFrames = frames
    }

    this.__loop(window.performance.now())
  }

  _loop(timestamp) {
    const now = window.performance.now()
    const timeSinceLast = now - this._lastFrameTime
    const targetTimeBetweenFrames = 1000 / this.targetFrameRate

    if (timeSinceLast >= targetTimeBetweenFrames - 5) {
      this.onFrame()
      this.frameRate = 1000 / (now - this._lastFrameTime)
      this._lastFrameTime = now
      this.frameCount++
    }

    if (this.looping) {
      let shouldLoop = true

      if (this.paused) {
        if (typeof this.stepFrames === 'number') {
          if (this.stepFrames === 0) {
            this.stepFrames = null
            shouldLoop = false
          } else {
            this.stepFrames--
          }
        } else {
          shouldLoop = false
        }
      }

      if (shouldLoop) {
        window.requestAnimationFrame(this.__loop)
      }
    }
  }
}