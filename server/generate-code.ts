import { randomInt } from 'node:crypto'

let adjectives = [
  'bright', 'calm', 'clever', 'cool', 'crisp',
  'daring', 'eager', 'fancy', 'fierce', 'gentle',
  'glad', 'golden', 'grand', 'happy', 'jolly',
  'keen', 'kind', 'lively', 'lucky', 'mellow',
  'mighty', 'neat', 'noble', 'plucky', 'proud',
  'quick', 'quiet', 'rapid', 'sharp', 'shiny',
  'silly', 'sleek', 'smooth', 'snappy', 'solar',
  'spicy', 'steady', 'stellar', 'swift', 'tender',
  'tidy', 'vivid', 'warm', 'wild', 'witty',
  'zappy', 'zesty', 'bold', 'brave', 'cozy',
]

let nouns = [
  'badger', 'banjo', 'beacon', 'brook', 'candle',
  'cedar', 'cloud', 'comet', 'coral', 'crane',
  'dingo', 'drum', 'ember', 'falcon', 'fern',
  'fig', 'finch', 'frost', 'grove', 'harbor',
  'hawk', 'heron', 'ivy', 'jade', 'lantern',
  'lark', 'maple', 'marsh', 'mango', 'moth',
  'otter', 'palm', 'panda', 'peach', 'pearl',
  'pebble', 'penny', 'plum', 'quail', 'raven',
  'reef', 'robin', 'sage', 'seal', 'spark',
  'squid', 'stork', 'tiger', 'tulip', 'walrus',
]

function pick(list: string[]) {
  return list[randomInt(list.length)]
}

export default function generateCode() {
  let adjective = pick(adjectives)
  let noun = pick(nouns)
  let number = randomInt(100).toString().padStart(2, '0')
  return `${adjective}-${noun}-${number}`
}
