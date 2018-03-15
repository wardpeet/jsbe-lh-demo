
'use strict';

const securityConfig = require('lighthouse-security/config')

// combine configs into one:
module.exports = Object.assign({},
  securityConfig,
  { extends: 'lighthouse:default' }
);