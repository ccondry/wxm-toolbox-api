const db = require('./db')

module.exports = {
  set
}

async function set ({id, type, vertical, status}) {
  try {
    // build provision data query and updates
    const query = {id}
    const updates = {
      $set: {
        [`demo.wxm-v2.${vertical}.${type}`]: status,
      },
      $currentDate: {
        'demo.wxm-v2.lastAccess': { $type: 'date' },
        'demo.wxm-v2.modified': { $type: 'date' }
      }
    }
    // console.log('setting user provision:', query, updates)
    // update user
    await db.updateOne('toolbox', 'users', query, updates)
  } catch (e) {
    throw e
  }
}
