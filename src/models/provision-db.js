const db = require('./db')

module.exports = {
  set,
  find
}

async function set (data) {
  try {
    // build provision data query
    const q = { username: data.username, demo: 'wxm', version: 'v1' }
    // build provision data object on top of input data
    const dbData = { demo: 'wxm', version: 'v2', ...data }
    const existing = await db.findOne('toolbox', 'provision', q)
    if (existing) {
      // update
      await db.updateOne('toolbox', 'provision', q, {$set: dbData})
    } else {
      // create new
      await db.insertOne('toolbox', 'provision', dbData)
    }
  } catch (e) {
    throw e
  }
}

async function find (username) {
  try {
    // console.log('finding provision info in mongo for wxm v1 for user', username)
    // get user provision data from mongo db
    const q = { username, demo: 'wxm', version: 'v2' }
    // don't return record id
    const projection = { _id: 0 }
    return db.findOne('toolbox', 'provision', q, {projection})
  } catch (e) {
    throw e
  }
}
