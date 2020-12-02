const express = require('express')
const router = express.Router()
// get/set provision info in our database
const provisionDb = require('../models/provision-db')
// get/create provision on WXM
const wxmClient = require('wxm-api-client')
// details of the different verticals like bank, heal, product...
const verticals = require('../models/vertical')

// setPreference jobs need to be run synchronously
const jobs = []

// 5 second throttle on jobs
const throttle = 5000

// an async sleep function
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processJobs () {
  try {
    // update preferences cache with each job's data
    for (const job of jobs) {
      // get preferences
      const preferences = await job.wxm.listPreferences()
      // add user to to the globalSyndicated list
      for (const viewName of job.views) {
        const view = preferences.views.find(v => v.viewName === viewName)
        const users = view.globalSyndicated.users
        if (users.includes(job.username)) {
          // already in list
          // console.log(job.username, 'was already in the', viewName, 'view')
        } else {
          // add to list
          // console.log('adding', job.username, 'to the', viewName, 'view')
          users.push(job.username)
        }
      }
      // update globalSyndicated list on WXM
      await job.wxm.setPreferences(preferences)
    }
    // remove finished jobs from the jobs list
    jobs.splice(0, jobs.length)
    // done
  } catch (e) {
    console.log('failed to get or save WXM preferences:', e.message)
  }
}

// run jobs constantly, with a throttle
async function jobManager () {
  while (true) {
    try {
      // process jobs list
      await processJobs()
    
      // wait before loop
      await sleep(throttle)
    } catch (e) {
      console.log('job runner failed:', e.message)
    }
  }
}

// start job manager
jobManager()

// const bannedDomains = [
//   'gmail.com',
//   'yahoo.com',
//   'hotmail.com',
//   'aol.com'
// ]

// get provision status for current logged-in user from our database
router.get('/', async function (req, res, next) {
  // console.log('request to get WXM provision status...')
  const username = req.user.username
  const userId = req.user.id
  const clientIp = req.clientIp
  const method = req.method
  // const host = req.get('host')
  const path = req.originalUrl
  // const url = req.protocol + '://' + host + path
  const operation = 'get user WXM provision status'

  try {
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    // find provision data in our database
    const data = await provisionDb.find(username)
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'successful')
    // if no data found, return empty object instead of null
    return res.status(200).send(data || {})
  } catch (e) {
    // error
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'error', e.message)
    // return 500 SERVER ERROR
    return res.status(500).send(e.message)
  }
})

// start user provision for WXM demo
router.post('/', async function (req, res, next) {
  const username = req.user.username
  const userId = req.user.id
  const clientIp = req.clientIp
  const method = req.method
  // const host = req.get('host')
  const path = req.originalUrl
  // const url = req.protocol + '://' + host + path
  const operation = 'provision user for WXM demo'

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
    // create instance of the WXM client for selected vertical
    const wxm = wxmClient({
      username: vertical.username,
      password: process.env.PASSWORD
    })

    // check that the user really does not exist already
    // find all existing users
    const users = await wxm.listUsers()
    // find all WXM users belonging to this toolbox user
    const myUsers = users.filter(v => {
      // filter by user ID
      return v.userName.slice(-4) === userId
    })
    // now check if the users they are trying to provision already exist
    const foundAgent = myUsers.find(v => {
      return v.userName === `${vertical.prefix}${agent}${userId}`
    })
    const foundSupervisor = myUsers.find(v => {
      return v.userName === `${vertical.prefix}${supervisor}${userId}`
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
        departmentId: vertical.departmentId
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
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'error', e.message)
    // return 500 SERVER ERROR
    res.status(500).send(e.message)
  }
})

module.exports = router
