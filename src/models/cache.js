// details of the different verticals like bank, heal, product...
const verticals = require('./verticals')
// get/create provision on WXM
const wxmClient = require('wxm-api-client')
// cache of users
const usersCache = {}

// create placeholders in usersCache for each vertical
for (const key of Object.keys(verticals)) {
  const vertical = verticals[key]
  usersCache[vertical.id] = []
}

// fill usersCache now
function fillCache () {
  for (const key of Object.keys(verticals)) {
    const vertical = verticals[key]
    // create WXM API client for specified vertical
    const wxm = new wxmClient({
      username: vertical.username,
      password: process.env.PASSWORD
    })
    // console.log('updating usersCache for vertical', key)
    // cache existing users
    wxm.listUsers()
    .then(users => {
      // console.log('usersCache updated for vertical', key)
      // overwrite existing cache
      usersCache[vertical.id] = users
    })
    .catch(e => {
      const message = `failed to get WXM users list for vertical "${key}": ${e.message}`
      console.log(message)
      teamsLogger.log(message)
    })
  }
}

// refresh cache every 10 minutes
setInterval(fillCache, 10 * 60 * 1000)

// get my users from usersCache, or from WXM if not in cache
async function getAllMyUsers (vertical, userId) {
  // look in usersCache first
  try {
    const myUsers = usersCache[vertical.id].filter(v => {
      // filter by user ID
      return v.userName.slice(-4) === userId
    })
    if (myUsers.length) {
      return myUsers
    } else {
      throw Error()
    }
  } catch (e) {
    try {
      // create WXM API client for specified vertical
      const wxm = new wxmClient({
        username: vertical.username,
        password: process.env.PASSWORD
      })
      // find all existing users in that vertical tenant
      const users = await wxm.listUsers()
      // console.log('found', users.length, 'users in vertical', vertical.prefix)
      // update usersCache
      usersCache[vertical.id] = users
      // find all WXM users belonging to this toolbox user in the specified vertical
      const myUsers = users.filter(v => {
        // filter by user ID
        return v.userName.slice(-4) === userId
      })
      
      // console.log('found', myUsers.length, 'my users in vertical', vertical.prefix)
      return myUsers
    } catch (e) {
      throw e
    }
  }
}

// get all fully provisioned users in specified vertical
async function getMyProvisionedUsers (vertical, userId) {
  try {
    // get all users for this user ID in the specified vertical
    const myUsers = await getAllMyUsers(vertical, userId)
    // check that each user has the all the correct views, remove from return
    // data if they do not have all correct views (so they can provision)
    const provisionedUsers = myUsers.filter(user => {
      // is this rick or sandra?
      // if rick, check supervisor views. if sandra, check agent views.
      let views
      // is this rick?
      if (user.enterpriseRoleId === vertical.supervisorRoleId) {
        // this user is rick - check rick's views against supervisor views
        // console.log('user', user.name, 'is a supervisor')
        views = vertical.supervisorViews
      } else if (user.enterpriseRoleId === vertical.agentRoleId) {
        // this user is sandra - check sandra's views against agent views
        // console.log('user', user.name, 'is an agent')
        views = vertical.agentViews
      } else {
        // should not be here if this is neither rick nor sandra...
        return false
      }
      // check each view in provision template data, and make sure this user
      // has those views
      // console.log('searching vertical views:', views)
      // console.log('in user views:', user.myViews.map(v => v.viewName))
      for (const view of views) {
        const hasView = user.myViews.find(v => {
          // console.log(`${v.viewName} === ${view}`)
          return v.viewName === view
        })
        // filter out this user if they don't have all the required views
        if (!hasView) {
          // console.log('user', user.name, 'does not have all the views for vertical', vertical.id)
          return false
        } else {
        }
      }
      
      // console.log('user', user.name, 'has all the views for vertical', vertical.id)
      // if not filtered out yet, then the user has all the correct views.
      return true
    })

    return provisionedUsers
  } catch (e) {
    throw e
  }
}

module.exports = {
  // get all users in specified vertical
  getAllMyUsers,
  // get all fully provisioned users in specified vertical
  getMyProvisionedUsers
}
