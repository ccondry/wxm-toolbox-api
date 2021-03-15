const db = require('./db')

// globals cache - these values all come from toolbox.globals in mongo db
const cache = {}

// gets global value from database
async function refresh () {
  // update cache
  try {
    const globals = await db.find('toolbox', 'globals')
    // reduce to key: value pairs
    for (const global of globals) {
      cache[global.name] = global.value
    }
  } catch (e) {
    console.log('error updating globals cache:', e.message)
  }
}

// prime the cache now:
const initialLoad = refresh()

// update cache values every 1 minute
const throttle = 1000 * 60 * 1
setInterval(refresh, throttle)

function get (name) {
  const g = cache[name]
  if (g) {
    return g
  } else {
    throw Error(`global ${name} not found`)
  }
}

// await the initial load and then get the var from globals cache
async function getAsync (name) {
  try {
    await Promise.resolve(initialLoad)
    return get(name)
  } catch (e) {
    throw e
  }
}

// export our specific cache value methods and the generic getCache method
module.exports = {
  refresh,
  initialLoad,
  get,
  getAsync
}