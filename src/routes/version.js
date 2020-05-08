const express = require('express')
const router = express.Router()
const pkg = require('../../package.json')

// get provision status for current logged-in user from our database
router.get('/', async function (req, res, next) {
  console.log('request to get version info...')
  const username = req.user.username
  const userId = req.user.id
  const clientIp = req.clientIp
  const method = req.method
  // const host = req.get('host')
  const path = req.originalUrl
  // const url = req.protocol + '://' + host + path
  const operation = 'get version info'

  try {
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    return res.status(200).send({version: pkg.version})
  } catch (e) {
    // error
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'error', e.message)
    // return 500 SERVER ERROR
    return res.status(500).send(e.message)
  }
})

module.exports = router
