'use strict';
const Audit = require('lighthouse').Audit;
const Util = require('lighthouse').Util;

const NBSP = '\xa0';
const FETCH_THRESHOLD = 3000;

function formatMilliseconds(ms, granularity = 10) {
  const coarseTime = Math.round(ms / granularity) * granularity;
  return `${coarseTime.toLocaleString()}${NBSP}ms`;
}

class TimeToLoadAds extends Audit {
  static get meta() {
    return {
      category: 'Performance',
      name: 'time-to-load-ads',
      description: 'The time it takes to load ads',
      informative: true,
      helpText: 'Ads should be high priority',
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  static caclulateEndTime(mainResource, adsRecord) {
    return (adsRecord._startTime - mainResource._endTime) * 1000
  }

  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    return Promise.all([
      artifacts.requestMainResource(devtoolsLogs),
      artifacts.requestNetworkRecords(devtoolsLogs),
    ]).then(([mainResource, networkRecords]) => {
        let debugString = '';

        const adsRecord = networkRecords.find(record => record._url.includes('https://securepubads.g.doubleclick.net/gampad'));
        const timeToFetch = TimeToLoadAds.caclulateEndTime(mainResource, adsRecord);
        const passed = timeToFetch < FETCH_THRESHOLD;

        if (!passed) {
          debugString = `Fetching ads took ${formatMilliseconds(timeToFetch, 1)}`;
        }

        return {
          rawValue: timeToFetch,
          score: passed,
          displayValue: formatMilliseconds(timeToFetch),
          debugString,
        };
      });

    return {
      rawValue: isHttpOnly
    };
  }
}

module.exports = TimeToLoadAds;
