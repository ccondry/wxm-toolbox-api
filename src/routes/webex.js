const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')

// add user to the support room
router.post('/', async (req, res, next) => {
  // validate input
  if (!req.query || !req.query.email || !req.query.email.length) {
    // invalid input
    console.log('failed to add user to the WXM Webex Teams support room: invalid input')
    // return 400
    return res.status(400).send(`"email" is a required query parameter.`)
  }
  const email = req.query.email
  try {
    console.log('request to add user to the WXM Webex Teams support room for', email)
    const url = 'https://api.ciscospark.com/v1/memberships'
    const options = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.WEBEX_BOT_TOKEN
      },
      body: JSON.stringify({
        roomId: process.env.SUPPORT_ROOM_ID,
        personEmail: email,
        isModerator: false
      })
    }
    const response = await fetch(url, options)
    const json = await response.json()
    if (response.ok) {
      // good response
      console.log('successfully add user to the WXM Webex Teams support room for', email)
      // return 202 ACCEPTED
      return res.status(202).send()
    } else {
      // bad response
      throw Error(`${response.status} ${response.statusText} - ${JSON.stringify(json.message)}`)
    }
  } catch (e) {
    // failed
    console.error('failed to add user to the WXM Webex Teams support room for', email, ':', e.message)
    // return 500 SERVER ERROR
    return res.status(500).send(e.message)
  }
})

module.exports = router
