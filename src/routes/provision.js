const express = require('express')
const router = express.Router()
const provision = require('../models/provision')
const wxm = require('../models/wxm')

// get provision status for current logged-in user from our database
router.get('/', async function (req, res, next) {
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
    const data = provision.find(username)
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
  const body = req.body
  // const agent = body.username

  try {
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    // check that the user really does not exist already
    // find all existing users
    const users = await wxm.listUsers()
    // find all WXM users belonging to this toolbox user
    const myUsers = users.filter(v => {
      // filter by user ID
      return v.userName.split('_')[0].slice(-4) === userId
    })
    // now check if the user they are trying to provision already exists
    const found = myUsers.find(v => {
      return v.userName.indexOf(body)
    })
    // did we find an existing user?
    if (found) {
      // user exists - don't recreate
      return res.status(200).send('User already provisioned. Not creating again.')
    } else {
      // user does not exist
      const agent = 'sjeffers'
      const agentName = 'Sandra Jefferson'
      const vertical = 'finance'
      const agentUsername = `${agent}${userId}_${vertical}`
      const password = 'dcloud@123'
      // try the request body email first, since the UI should request the
      // user's corporate email if they use gmail or other free account for
      // their toolbox email
      const email = req.body.email || req.user.email
      // verify email is not a free account.
      const parts = email.split('@')
      const domain = parts[1]
      if (bannedDomains.includes(domain)) {
        // bad email address. return 400
        return res.status(400).send('Please use your corporate email address. Free email address domains like gmail.com are not valid here.')
      }
      // create user
      await wxm.createUser({
        name: `${agentName} ${userId}`,
        username: agentUsername,
        email,
        password
      })

      // log success
      console.log('user', username, userId, 'WXM provisioning successful for', agentUsername)
      console.log('marking user', username, userId, 'as provisioned in cloud db')
      // mark user provisioned in our cloud db
      await provision.set(username, userId)
    }

    // return 200 OK
    return res.status(200).send('User account has been provisioned. Check your email.')
  } catch (e) {
    // error
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'error', e.message)
    // return 500 SERVER ERROR
    res.status(500).send(e.message)
  }
})

module.exports = router
