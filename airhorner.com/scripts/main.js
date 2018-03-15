/*
 *
 *  Air Horner
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License');
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
(function() {
  'use strict';
  
  const AmbientLightController = function(lightThreshold) {
    this.start = function() {
      if (window.AmbientLightSensor) {
        const sensor = new AmbientLightSensor();
        sensor.onchange = function(e) {
          const illuminance = e.reading.illuminance;
          if (illuminance < lightThreshold) {
            this.onUnderThreshold();
          } else {
            this.onOverThreshold();
          }
        }.bind(this);
        sensor.start();
      }
    };
  
    this.stop = function() {
      sensor.stop();
    };
  
    this.onUnderThreshold = function() {};
    this.onOverThreshold = function() {};
  };
  
  const Horn = function() {
    // The Horn Player.
  
    const audioSrc = '/sounds/airhorn.mp3';
    let noAudioContext = false;
    let fallbackAudio;
    let audioCtx = (window.AudioContext || window.webkitAudioContext);
    const self = this;
    let source;
    let buffer;
  
    if (audioCtx !== undefined) {
      audioCtx = new audioCtx();
    } else {
      noAudioContext = true;
      fallbackAudio = document.createElement('audio');
    }
  
    const loadSound = function(callback) {
      callback = callback || function() {};
  
      if (noAudioContext) {
        fallbackAudio.src = audioSrc;
        return;
      }
  
      // AudioContext must be resumed after the document received a user gesture to enable audio playback.
      audioCtx.resume();
  
      if (!!buffer == true) {
        // If the buffer is already loaded, use that.
        callback(buffer);
        return;
      }
      
      const xhr = new XMLHttpRequest();
  
      xhr.onload = function() {
        audioCtx.decodeAudioData(xhr.response, function(decodedBuffer) {
          callback(decodedBuffer);
        });
      };
  
      xhr.open('GET', audioSrc);
      xhr.responseType = 'arraybuffer';
      xhr.send();
    };
  
  
    this.start = function(opts) {
      const shouldLoop = opts.loop; // always loop if from an event.
  
      if (noAudioContext) {
        fallbackAudio.loop = shouldLoop;
        fallbackAudio.currentTime = 0;
        fallbackAudio.play();
        return;
      }
  
      loadSound(function(tmpBuffer) {
        source = audioCtx.createBufferSource();
  
        source.connect(audioCtx.destination);
  
        source.buffer = tmpBuffer;
  
        source.onended = function() {
          self.stop();
        };
  
        source.start(0);
        source.loop = shouldLoop;
        source.loopStart = 0.24;
        source.loopEnd = 0.34;
      });
    };
  
    this.stop = function() {
      if (!!source === true) {
        source.loop = false;
      }
  
      if (noAudioContext) {
        fallbackAudio.loop = false;
        fallbackAudio.pause();
      }
  
      this.onstopped();
    };
  
    this.onstopped = function() {};
  
    const init = function() {
      loadSound(function(decodedBuffer) {
        buffer = decodedBuffer;
      });
    };
  
    init();
  };
  
  const Installer = function(root) {
    const tooltip = root.querySelector('.tooltip');
  
    const install = function(e) {
      e.preventDefault();
      window.install.prompt()
          .then(function(outcome) {
            // The user actioned the prompt (good or bad).
            ga('send', 'event', 'install', outcome);
            root.classList.remove('available');
          })
          .catch(function(installError) {
            // Boo. update the UI.
            ga('send', 'event', 'install', 'errored');
          });
    };
  
    const init = function() {
      window.install.canPrompt()
          .then(function() {
            root.classList.add('available');
            ga('send', 'event', 'install', 'prompted');
          });
    };
  
    root.addEventListener('click', install.bind(this));
    root.addEventListener('touchend', install.bind(this));
  
    init();
  };
  
  const AirHorn = function(root) {
    // Controls the AirHorn.
  
    const airhornImage = root.querySelector('.horn');
    const horn = new Horn();
  
    const start = function(e) {
      if (!!e == true) {
        e.preventDefault();
  
        if (e.touches && e.touches.length > 1) {
          // Multi touch. OFF.
          return false;
        }
      }
  
      this.start({loop: true});
    };
  
    const stop = function(e) {
      if (!!e == true) e.preventDefault();
      this.stop();
    };
  
    this.start = function(opts) {
      // Play the sound
      airhornImage.classList.add('horning');
      horn.start(opts);
  
      horn.onstopped = function() {
        airhornImage.classList.remove('horning');
      };
  
      ga('send', 'event', 'horn', 'play');
    };
  
    this.stop = function() {
      // Stop the sound
      airhornImage.classList.remove('horning');
      horn.stop();
    };
  
    airhornImage.addEventListener('mousedown', start.bind(this));
    airhornImage.addEventListener('touchstart', start.bind(this));
  
    document.documentElement.addEventListener('mouseup', stop.bind(this));
    document.documentElement.addEventListener('touchend', stop.bind(this));
  };
  
  (function() {
    let deferredInstall;
    let promptTriggered = false;
    // The resolve function that will be called when we know we can prompt.
    let canPromptPromiseResolved;
    const canPromptPromise = new Promise(function(resolve, reject) {
      // The resolve will be called later when we know the prompt has been shown.
      // We might want to reject after a timeout of a couple of seconds.
      canPromptPromiseResolved = resolve;
    });
  
    window.addEventListener('beforeinstallprompt', function(e) {
      promptTriggered = true;
  
      // Stop it doing what it needs to do;
      e.preventDefault();
      deferredInstall = e;
  
      // Resolve the promise, to say that we know we can prompt.
      canPromptPromiseResolved();
  
      return false;
    });
  
    const install = {};
  
    Object.defineProperty(install, 'isAvailable', {get: function() {
      return promptTriggered;
    }});
  
    install.canPrompt = function() {
      return canPromptPromise;
    };
  
    install.prompt = function() {
      return new Promise(function(resolve, reject) {
        if (promptTriggered === false) {
          // There can be a whole host or reasons, we should determine them
          reject('User Agent decided not to prompt');
        }
  
        deferredInstall.prompt().then(function() {
          return deferredInstall.userChoice;
        }).then(function(choice) {
          resolve(choice.outcome);
        }).catch(function(reason) {
          reject(reason);
        });
      });
    };
  
    window.install = install;
  })();
  
  window.addEventListener('load', function() {
    const airhornEl = document.getElementById('airhorn');
    const installEl = document.getElementById('installer');
    const airhorn = new AirHorn(airhornEl);
    const installer = new Installer(installEl);
    const ambient = new AmbientLightController(1);
    let isLooping = false;
  
    if (Comlink && window.opener) {
      // We are ready. Tell the opener.
      const channel = new MessageChannel();
      const port1 = channel.port1;
      Comlink.expose(airhorn, port1);
      opener.postMessage({'cmd': 'READY'}, '*', [channel.port2]);
    }
  
    if (navigator.presentation && navigator.presentation.receiver) {
      navigator.presentation.receiver.connectionList.then(list => {
        list.connections.forEach(connection => {
          Comlink.expose(airhorn, MessageChannelAdapter.wrap(connection));
        });
        list.onconnectionavailable = event => {
          Comlink.expose(airhorn, MessageChannelAdapter.wrap(event.connection));
        };
      });
    }
  
    ambient.onUnderThreshold = function() {
      if (isLooping === false) {
        airhorn.start({loop: true});
        isLooping = true;
      }
    };
  
    ambient.onOverThreshold = function() {
      airhorn.stop();
      isLooping = false;
    };
  
    if (location.hash == '#instant') {
      airhorn.start({loop: false});
    }
  
    if (location.hash === '#dark') {
      ambient.start();
    }
  
    window.addEventListener('hashchange', function() {
      if (location.hash === '#dark') {
        ambient.start();
      }
  
      if (location.hash == '#instant') {
        airhorn.start({loop: false});
      }
    });
  
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        airhorn.stop();
      }
    });
  });
  })();