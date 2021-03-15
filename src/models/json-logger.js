const fs = require('fs')
const util = require('util')
const writeFilePromise = util.promisify(fs.writeFile)

module.exports = async function (name, content) {
  const filename = name + '.json'
  try {
    const data = JSON.stringify(content, null, 2)
    await writeFilePromise(filename, data, 'utf8')
    console.log(`save ${filename} successful`)
  } catch (e) {
    console.log(`failed to save ${filename}`, e.message)
  }
}