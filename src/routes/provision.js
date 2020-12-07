const express = require('express')
const router = express.Router()
// get/set provision info in our database
const provisionDb = require('../models/provision-db')
// get/create provision on WXM
const wxmClient = require('wxm-api-client')
// details of the different verticals like bank, heal, product...
const verticals = require('../models/verticals')
const teamsLogger = require('../models/teams-logger')

// setPreference jobs need to be run synchronously
const jobs = require('../models/jobs')

// cache of users
const cache = {}

// create placeholders in cache for each vertical
for (const key of Object.keys(verticals)) {
  const vertical = verticals[key]
  cache[vertical.id] = []
}

// fill cache now
for (const key of Object.keys(verticals)) {
  const vertical = verticals[key]
  // create WXM API client for specified vertical
  const wxm = new wxmClient({
    username: vertical.username,
    password: process.env.PASSWORD
  })
  // console.log('updating cache for vertical', key)
  // cache existing users
  wxm.listUsers()
  .then(users => {
    // console.log('cache updated for vertical', key)
    cache[vertical.id] = users
  })
  .catch(e => {
    const message = `failed to get WXM users list for vertical "${key}": ${e.message}`
    console.log(message)
    teamsLogger.log(message)
  })
}

// get my users from cache or from WXM
async function getMyUsers (vertical, userId) {
  // look in cache first
  try {
    const myUsers = cache[vertical.id].filter(v => {
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
      // update cache
      cache[vertical] = users
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

// get provision status for current logged-in user from our database
router.get('/', async function (req, res, next) {
  const userId = req.user.id

  try {
    // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    // create instance of the WXM client for selected vertical
    const vertical = verticals[req.query.vertical || 'bank']
    if (!vertical) {
      // invalid vertical specified in request body
      // build a nice error message about why it failed and how to fix it
      const verticalsList = JSON.stringify(Object.keys(verticals))
      const message = `The vertical "${req.body.vertical}" was not found. Please specify one of these: ${verticalsList}`
      return res.status(400).send({message})
    }
    
    const myUsers = await getMyUsers(vertical, userId)
    
    // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'successful')
    return res.status(200).send(myUsers)
  } catch (e) {
    // error
    const message = `failed to get provision status for user ${req.user.username}: ${e.message}`
    console.log(message)
    teamsLogger.log(message)
    // return 500 SERVER ERROR
    return res.status(500).send({message})
  }
})

// start user provision for WXM demo
router.post('/', async function (req, res, next) {
  const username = req.user.username
  const userId = req.user.id

  try {
    // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    
    // set up provision data
    // get vertical details using vertical name specified in request body
    // default to bank vertical for backward compatibility with v1 demo
    const vertical = verticals[req.body.vertical || 'bank']
    if (!vertical) {
      // invalid vertical specified in request body
      // build a nice error message about why it failed and how to fix it
      const verticalsList = JSON.stringify(Object.keys(verticals))
      const message = `The vertical "${req.body.vertical}" was not found. Please specify one of these: ${verticalsList}`
      return res.status(400).send({message})
    }
    const agent = 'sjeffers'
    const supervisor = 'rbarrows'
    const agentName = 'Sandra Jefferson'
    const supervisorName = 'Rick Barrows'
    const agentUsername = `${agent}${userId}`
    const supervisorUsername = `${supervisor}${userId}`
    const password = process.env.AGENT_PASSWORD || 'C1sco12345!'
    // try the request body email first, then the user's toolbox email.
    // the UI should request the user's corporate email if they use gmail or
    // other free account for their toolbox email
    const email = req.body.email || req.user.email
    // verify email is not a free account.
    // const parts = email.split('@')
    // const domain = parts[1]
    // if (bannedDomains.includes(domain)) {
    //   console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested, but they are using an email address on the banned domains list:', email, '. Returning 400 error.')
    //   // bad email address. return 400
    //   return res.status(400).send('Please use your corporate email address. Free email address domains like gmail.com are not valid here.')
    // }
    const agentEmail = email
    const supervisorEmail = email

    // check that the user really does not exist already
    const myUsers = await getMyUsers(vertical, userId)
    // now check if the users they are trying to provision already exist
    const foundAgent = myUsers.find(v => {
      return v.userName === `${vertical.prefix}${agent}${userId}`
    })
    const foundSupervisor = myUsers.find(v => {
      return v.userName === `${vertical.prefix}${supervisor}${userId}`
    })

    // create instance of the WXM client for selected vertical
    const wxm = new wxmClient({
      username: vertical.username,
      password: process.env.PASSWORD
    })
    
    // did we find an existing user?
    if (foundAgent) {
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - agent already provisioned.')
    } else {
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning agent...')
      // set up new agent user profile details
      const options = {
        name: `${agentName} ${userId}`,
        username: agentUsername,
        email: agentEmail,
        password,
        enterpriseRole: 'Contact Center - Agent',
        enterpriseRoleId: vertical.agentRoleId,
        departmentId: vertical.departmentId,
        isEmailVerified = false,
        highPrecisionMode = true
      }
      // debug log
      // console.log('options', options)
      // create new user on WXM
      await wxm.createUser(options)
      // add setPreference job
      jobs.push({
        job: 'setPreference',
        username: vertical.prefix + agentUsername,
        role: 'agent',
        views: vertical.agentViews,
        wxm
      })
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning agent complete.')
    }
    // mark agent provisioned for this user in our database
    await provisionDb.set({username, id: userId, agent: true})
    
    // did the supervisor agent exist?
    if (foundSupervisor) {
      // supervisor already exists
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - supervisor already provisioned.')
    } else {
      // supervisor does not exist - create it
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning supervisor...')
      // set up new supervisor user profile details
      const options = {
        name: `${supervisorName} ${userId}`,
        username: supervisorUsername,
        email: supervisorEmail,
        password,
        enterpriseRole: 'Contact Center - Manager',
        enterpriseRoleId: vertical.supervisorRoleId,
        departmentId: vertical.departmentId
      }
      // create new user on WXM
      await wxm.createUser(options)
      // add setPreference job for the new user on WXM
      jobs.push({
        job: 'setPreference',
        username: vertical.prefix + supervisorUsername,
        role: 'supervisor',
        views: vertical.supervisorViews,
        wxm
      })
      // console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning supervisor complete.')
    }
    // mark supervisor user provisioned in our cloud db
    await provisionDb.set({username, id: userId, supervisor: true})

    if (foundAgent && foundSupervisor) {
      // already provisioned
      // return 200 OK with message
      return res.status(200).send('Agent and supervisor already provisioned. Not creating again.')
    } else {
      // provision complete
      // return 200 OK with message
      return res.status(200).send('Agent and supervisor account have been provisioned. Check your email.')
    }
  } catch (e) {
    // error
    const message = `failed to provision user ${req.user.username}: ${e.message}`
    console.log(message)
    teamsLogger.log(message)
    // return 500 SERVER ERROR
    return res.status(500).send({message})
  }
})

module.exports = router
