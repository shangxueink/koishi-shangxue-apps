'use strict'

const path = require('node:path')

const sourceEntry = path.join(__dirname, '../src/index.ts')

if (process.env.NODE_ENV === 'development' && require.extensions['.ts']) {
  module.exports = require(sourceEntry)
} else {
  module.exports = require('./compiled/index.js')
}
