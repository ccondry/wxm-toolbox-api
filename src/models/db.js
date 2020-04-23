/*
This provides some simple async methods for using a mongo database
*/
const MongoClient = require('mongodb').MongoClient
const pkg = require('../../package.json')
if (!process.env.MONGO_URL) {
  console.error(pkg.name, '- process.env.MONGO_URL is not defined. Please configure this variable in the .env file.')
} else {
  try {
    const redacted = process.env.MONGO_URL.split('@').pop()
    console.log('process.env.MONGO_URL =', redacted)
  } catch (e) {
    console.log('process.env.MONGO_URL is set, but failed to redact the password from that URL, so not displaying it here.')
  }
}

// Connection URL
const url = process.env.MONGO_URL
const connectOptions = { useNewUrlParser: true }

module.exports = class DB {
  constructor (dbName = 'toolbox') {
    this.dbName = dbName
  }

  // get authenticated mongo client
  getClient () {
    return new Promise(function (resolve, reject) {
      // connect to mongo and then return the client
      MongoClient.connect(url, connectOptions, function(err, client) {
        // check for error
        if (err) {
          // error
          return reject(err)
        } else {
          // success
          resolve(client)
        }
      })
    })
  }

  find (collection, query = {}, projections) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // find!
        db.collection(collection)
        .find(query).project(projections)
        .toArray(function(queryError, doc) {
          // close the client connection
          client.close()
          // check for error
          if (queryError) reject(queryError)
          // success
          else resolve(doc)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

  // mongo find one (returns object)
  findOne (collection, query, options) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // find!
        db.collection(collection).findOne(query, options, function (err, result) {
          // close the client connection
          client.close()
          // check for error
          if (err) reject(err)
          // success
          else resolve(result)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

  // mongo insert
  insertOne (collection, data) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // insert!
        db.collection(collection).insertOne(data, function (err, result) {
          // close the client connection
          client.close()
          // check for error
          if (err) reject(err)
          // success
          else resolve(result)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

  // mongo upsert (update existing or insert new if not exist)
  upsert (collection, query, data) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // upsert!
        db.collection(collection).findOneAndReplace(query, data, { upsert: true }, function (err, result) {
          // close the client connection
          client.close()
          // check for error
          if (err) reject(err)
          // success
          else resolve(result)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

  // mongo updateOne (update one existing record)
  updateOne (collection, filter, query) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // upsert!
        db.collection(collection).updateOne(filter, query, function (err, result) {
          // close the client connection
          client.close()
          // check for error
          if (err) reject(err)
          // success
          else resolve(result)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

  removeOne (collection, query) {
    return new Promise((resolve, reject) => {
      // get mongo client
      this.getClient()
      .then(client => {
        // use db already specified in connect url
        const db = client.db(this.dbName)
        // go
        db.collection(collection).removeOne(query, function (err, result) {
          // close the client connection
          client.close()
          // check for error
          if (err) reject(err)
          // success
          else resolve(result)
        })
      })
      .catch(e => {
        // failed to get client
        reject(e)
      })
    })
  }

}
