const express = require('express')
const router = express.Router()
const provision = require('../models/provision')
const wxm = require('../models/wxm')

// setPreference jobs need to be run synchronously
const jobs = []

// 5 second throttle on jobs
const throttle = 5000

// an async sleep function
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// run jobs constantly, with a throttle
async function runJobs () {
  try {
    const validJobs = []
    // are there any jobs?
    if (jobs.length) {
      console.log('found', jobs.length, 'WXM set preference jobs...')
      // get preferences
      const preferences = await wxm.listPreferences()
      // update preferences cache with each job's data
      for (const job of jobs) {
        // add agents and supervisors to Contact Center view
        if (job.role === 'agent') {
          const viewName = 'Agent Dashboard'
          const view = preferences.views.find(v => v.viewName === viewName)
          const users = view.globalSyndicated.users
          if (users.includes(job.username)) {
            // already in list
            console.log(job.username, 'was already in the', viewName, 'view')
          } else {
            // add to list
            console.log('adding', job.username, 'to the', viewName, 'view')
            users.push(job.username)
            validJobs.push(job)
          }
        }

        // add supervisors to ATM, Website, Branch, Overall Experience
        if (job.role === 'supervisor') {
          const viewNames = ['Contact Center', 'ATM', 'Website', 'Branch', 'Overall Experience']
          for (const viewName of viewNames) {
            const view = preferences.views.find(v => v.viewName === viewName)
            const users = view.globalSyndicated.users
            if (users.includes(job.username)) {
              // already in list
              console.log(job.username, 'was already in the', viewName, 'view')
            } else {
              // add to list
              console.log('adding', job.username, 'to the', viewName, 'view')
              users.push(job.username)
              validJobs.push(job)
            }
          }
        }
      }
      if (validJobs.length > 0) {
        // save updated preferences on server
        await wxm.setPreferences(preferences)
        console.log('saved WXM preferences for', jobs.length, 'usernames')
      } else {
        // no changes
        console.log('no changes to save to WXM preferences.')
      }
      // remove finished jobs
      jobs.splice(0, jobs.length)
    }
  } catch (e) {
    console.log('failed to get or save WXM preferences:', e.message)
  }

  // wait before running again
  await sleep(throttle)
  // run again
  runJobs()
}

// start job runner
runJobs()
// const bannedDomains = [
//   'gmail.com',
//   'yahoo.com',
//   'hotmail.com',
//   'aol.com'
// ]
// get provision status for current logged-in user from our database
router.get('/', async function (req, res, next) {
  console.log('request to get WXM provision status...')
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
    const data = await provision.find(username)
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
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    // set up provision data
    const prefix = 'dcwxmbank'
    const agent = 'sjeffers'
    const supervisor = 'rbarrows'
    const agentName = 'Sandra Jefferson'
    const supervisorName = 'Rick Barrows'
    const agentUsername = `${agent}${userId}`
    const supervisorUsername = `${supervisor}${userId}`
    const password = 'C1sco12345!'
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
    // find all existing users
    const users = await wxm.listUsers()
    // find all WXM users belonging to this toolbox user
    const myUsers = users.filter(v => {
      // filter by user ID
      return v.userName.slice(-4) === userId
    })
    // now check if the user they are trying to provision already exists
    const foundAgent = myUsers.find(v => {
      return v.userName === `${prefix}${agent}${userId}`
    })
    const foundSupervisor = myUsers.find(v => {
      return v.userName === `${prefix}${supervisor}${userId}`
    })
    // did we find an existing user?
    if (foundAgent) {
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - agent already provisioned.')
    } else {
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning agent...')
      // create agent
      const options = {
        name: `${agentName} ${userId}`,
        username: agentUsername,
        email: agentEmail,
        password,
        enterpriseRole: 'Contact Center - Agent',
        enterpriseRoleId: '5e9964534e67f10e4873af46'
      }
      console.log('options', options)
      await wxm.createUser(options)
      // add setPreference job
      jobs.push({
        job: 'setPreference',
        username: prefix + agentUsername,
        role: 'agent'
      })
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning agent complete.')
    }
    // mark agent provisioned for this user in our cloud db
    await provision.set({username, id: userId, agent: true})
    
    if (foundSupervisor) {
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - supervisor already provisioned.')
    } else {
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning supervisor...')
      // create supervisor
      const options = {
        name: `${supervisorName} ${userId}`,
        username: supervisorUsername,
        email: supervisorEmail,
        password,
        enterpriseRole: 'Contact Center - Manager',
        enterpriseRoleId: '5e99645c25d9431884faad71'
      }
      await wxm.createUser(options)
      // add setPreference job
      jobs.push({
        job: 'setPreference',
        username: prefix + supervisorUsername,
        role: 'supervisor'
      })
      console.log('user', username, userId, 'at IP', clientIp, operation, method, path, ' - provisioning supervisor complete.')
    }
    // mark supervisor user provisioned in our cloud db
    await provision.set({username, id: userId, supervisor: true})

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
