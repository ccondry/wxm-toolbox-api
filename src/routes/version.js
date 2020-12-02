const express = require('express')
const router = express.Router()
const pkg = require('../../package.json')

// get this software name and version
router.get('/', async function (req, res, next) {
  try {
    return res.status(200).send({
      name: pkg.name,
      version: pkg.version
    })
  } catch (e) {
    // error
    console.log(`failed to get version info: ${e.message}`)
    // return 500 SERVER ERROR
    return res.status(500).send({message: e.message})
  }
})

module.exports = router
