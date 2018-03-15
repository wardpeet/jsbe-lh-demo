'use strict';


// combine configs into one:
module.exports = {
  extends: 'lighthouse:default',
  audits: [
    'audit/time-to-load-ads',
  ],
  categories: {
    mysite: {
      name: 'My site',
      description: 'All audits that belong to my site',
      audits: [{id: 'time-to-load-ads', weight: 1}],
    }
  }
};