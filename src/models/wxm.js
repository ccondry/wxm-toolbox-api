const lib = require('wxm-api-client')
const client = new lib({
  username: process.env.USERNAME,
  password: process.env.PASSWORD
})
module.exports = client
