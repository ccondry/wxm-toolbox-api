const DB = require('./db')
const db = new DB('toolbox')

module.exports = {
  set,
  find
}

function set (username, id) {
  // build provision data query
  const q = { username, demo: 'wxm', version: 'v1' }
  // build provision data object
  const data = {
    username,
    id,
    demo: 'wxm',
    version: 'v1'
  }
  // add or update provision data to mongo db
  return db.upsert('provision', q, data)
}

function find (username) {
  // get user provision data from mongo db
  const q = { username, demo: 'wxm', version: 'v1' }
  // don't return record id
  const projection = { _id: 0 }
  return db.findOne('provision', q, {projection})
}
