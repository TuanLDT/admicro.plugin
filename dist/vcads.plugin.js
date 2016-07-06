/*! vcads.plugin - v1.0.0 - 2016-07-06
* Copyright (c) 2016 Le Dac Thanh Tuan; Licensed Apache-2.0 */
/*! sohatv-adSoha - v0.2.0 - 2014-12-08
* Copyright (c) 2014 Le Dac Thanh Tuan;
* Copyright (c) 2014 The Onion
* Licensed MIT */
(function(window, videojs) {
  'use strict';

  var defaults = {
    src : '',
    href : '',
    target: '_blank',
    allowSkip: true,
    skipTime: 5,
    repeatAd: true
  }, adSohaPlugin;

  /**
   * Initialize the plugin.
   *
   * @param options
   *            (optional) {object} configuration for the plugin
   */
  adSohaPlugin = function(options) {
    var player = this.player();
    player.adSoha = {};
    options.timeout = options.timeout || 3000;
    player.ads(options);
    if (options.vast) {
      player.vast(options.vast);
      return;
    }
  };

  // register the plugin
  videojs.plugin('adSoha', adSohaPlugin);
})(window, window.videojs);

(function(factory){
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('videojs-contrib-ads', ['videojs'], function(vjs){factory(window, document, vjs);});
    } else if (typeof exports === 'object' && typeof module === 'object') {
        factory(window, document, require('video.js'));
    } else {
        factory(window, document, videojs);
    }
})
/**
 * Basic Ad support plugin for video.js.
 *
 * Common code to support ad integrations.
 */
(function(window, document, vjs, undefined) {
"use strict";

var

  /**
   * Copies properties from one or more objects onto an original.
   */
  extend = function(obj /*, arg1, arg2, ... */) {
    var arg, i, k;
    for (i=1; i<arguments.length; i++) {
      arg = arguments[i];
      for (k in arg) {
        if (arg.hasOwnProperty(k)) {
          obj[k] = arg[k];
        }
      }
    }
    return obj;
  },

  /**
   * Add a handler for multiple listeners to an object that supports addEventListener() or on().
   *
   * @param {object} obj The object to which the handler will be assigned.
   * @param {mixed} events A string, array of strings, or hash of string/callback pairs.
   * @param {function} callback Invoked when specified events occur, if events param is not a hash.
   *
   * @return {object} obj The object passed in.
   */
  on = function(obj, events, handler) {

    var

      type = Object.prototype.toString.call(events),

      register = function(obj, event, handler) {
        if (obj.addEventListener) {
          obj.addEventListener(event, handler);
        } else if (obj.on) {
          obj.on(event, handler);
        } else if (obj.attachEvent) {
          obj.attachEvent('on' + event, handler);
        } else {
          throw new Error('object has no mechanism for adding event listeners');
        }
      },

      i,
      ii;

    switch (type) {
      case '[object String]':
        register(obj, events, handler);
        break;
      case '[object Array]':
        for (i = 0, ii = events.length; i<ii; i++) {
          register(obj, events[i], handler);
        }
        break;
      case '[object Object]':
        for (i in events) {
          if (events.hasOwnProperty(i)) {
            register(obj, i, events[i]);
          }
        }
        break;
      default:
        throw new Error('Unrecognized events parameter type: ' + type);
    }

    return obj;

  },

  /**
   * Runs the callback at the next available opportunity.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/window.setImmediate
   */
  setImmediate = function(callback) {
    return (
      window.setImmediate ||
      window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.setTimeout
    )(callback, 0);
  },

  /**
   * Clears a callback previously registered with `setImmediate`.
   * @param {id} id The identifier of the callback to abort
   */
  clearImmediate = function(id) {
    return (window.clearImmediate ||
            window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.clearTimeout)(id);
  },

  /**
   * If ads are not playing, pauses the player at the next available
   * opportunity. Has no effect if ads have started. This function is necessary
   * because pausing a video element while processing a `play` event on iOS can
   * cause the video element to continuously toggle between playing and paused
   * states.
   *
   * @param {object} player The video player
   */
  cancelContentPlay = function(player) {
    if (player.ads.cancelPlayTimeout) {
      // another cancellation is already in flight, so do nothing
      return;
    }
    player.ads.cancelPlayTimeout = setImmediate(function() {
      // deregister the cancel timeout so subsequent cancels are scheduled
      player.ads.cancelPlayTimeout = null;

      // pause playback so ads can be handled.
      if (!player.paused()) {
        player.pause();
      }

      // add a contentplayback handler to resume playback when ads finish.
      player.one('contentplayback', function() {
        // TuanLDT edit --S
        // Khi cài adsblock thì bị chặn quảng cáo. Có bắn ra adscancel nhưng trạng thái player đang pause mà lại get được là playing
        if ((player.ads.snapshot && player.ads.snapshot.isPlaying) || player.autoplay()) { 
          player.play();
        }
      });
    });
  },

  /**
   * Returns an object that captures the portions of player state relevant to
   * video playback. The result of this function can be passed to
   * restorePlayerSnapshot with a player to return the player to the state it
   * was in when this function was invoked.
   * @param {object} player The videojs player object
   */
  getPlayerSnapshot = function(player) {
    if (player.ads.snapshot) return player.ads.snapshot;
    var
      tech = player.el().querySelector('.vjs-tech'),
      tracks = player.remoteTextTracks ? player.remoteTextTracks() : [],
      track,
      i,
      suppressedTracks = [],
      snapshot = {
        src: player.src() || player.currentSrc(), // TuanLDT add 
        //src: player.currentSrc(),
        currentTime: player.currentTime(),
        type: player.currentType()
      };

    if (tech) {
      snapshot.nativePoster = tech.poster;
      snapshot.style = tech.getAttribute('style');
    }

    i = tracks.length;
    while (i--) {
      track = tracks[i];
      suppressedTracks.push({
        track: track,
        mode: track.mode
      });
      track.mode = 'disabled';
    }
    snapshot.suppressedTracks = suppressedTracks;

    player.one(['play', 'playing'], function() {
      player.ads.snapshot.isPlaying = true;
    });

    return snapshot;
  },

  removeClass = function(element, className) {
    var
      classes = element.className.split(/\s+/),
      i = classes.length,
      newClasses = [];
    while (i--) {
      if (classes[i] !== className) {
        newClasses.push(classes[i]);
      }
    }
    element.className = newClasses.join(' ');
  },

  /**
   * Attempts to modify the specified player so that its state is equivalent to
   * the state of the snapshot.
   * @param {object} snapshot - the player state to apply
   */
  restorePlayerSnapshot = function(player, snapshot) {
    var
      // the playback tech
      tech = player.el().querySelector('.vjs-tech'),

      // the number of remaining attempts to restore the snapshot
      attempts = 20,

      suppressedTracks = snapshot.suppressedTracks,
      trackSnapshot,
      restoreTracks =  function() {
        var i = suppressedTracks.length;
        while (i--) {
          trackSnapshot = suppressedTracks[i];
          trackSnapshot.track.mode = trackSnapshot.mode;
        }
      },

      // finish restoring the playback state
      resume = function() {
        player.currentTime(snapshot.currentTime);
        //If this wasn't a postroll resume
        if (!player.ended() && snapshot.isPlaying) {
          player.play();
        }
      },

      // determine if the video element has loaded enough of the snapshot source
      // to be ready to apply the rest of the state
      tryToResume = function() {
        if (tech.seekable === undefined) {
          // if the tech doesn't expose the seekable time ranges, try to
          // resume playback immediately
          resume();
          return;
        }
        if (tech.seekable.length > 0) {
          // if some period of the video is seekable, resume playback
          resume();
          return;
        }

        // delay a bit and then check again unless we're out of attempts
        if (attempts--) {
          setTimeout(tryToResume, 50);
        }
      },

      // whether the video element has been modified since the
      // snapshot was taken
      srcChanged;

    if (snapshot.nativePoster) {
      tech.poster = snapshot.nativePoster;
    }

    if ('style' in snapshot) {
      // overwrite all css style properties to restore state precisely
      tech.setAttribute('style', snapshot.style || '');
    }

    // Determine whether the player needs to be restored to its state
    // before ad playback began. With a custom ad display or burned-in
    // ads, the content player state hasn't been modified and so no
    // restoration is required

    if (player.src()) {
      // the player was in src attribute mode before the ad and the
      // src attribute has not been modified, no restoration is required
      // to resume playback
      srcChanged = player.src() !== snapshot.src;
    } else {
      // the player was configured through source element children
      // and the currentSrc hasn't changed, no restoration is required
      // to resume playback
      srcChanged = player.currentSrc() !== snapshot.src;
    }

    if (srcChanged) {
      // on ios7, fiddling with textTracks too early will cause it safari to crash
      player.one('loadedmetadata', restoreTracks);

      // if the src changed for ad playback, reset it
      setTimeout(function() {
        player.src({ src: snapshot.src, type: snapshot.type });
      }, 10);
      // safari requires a call to `load` to pick up a changed source
      player.load();
      // and then resume from the snapshots time once the original src has loaded
      player.one('loadedmetadata', tryToResume);
    } else if (!player.ended()) {
      // if we didn't change the src, just restore the tracks
      restoreTracks();

      // the src didn't change and this wasn't a postroll
      // just resume playback at the current time.
      player.play();
    }
  },

  /**
   * Remove the poster attribute from the video element tech, if present. When
   * reusing a video element for multiple videos, the poster image will briefly
   * reappear while the new source loads. Removing the attribute ahead of time
   * prevents the poster from showing up between videos.
   * @param {object} player The videojs player object
   */
  removeNativePoster = function(player) {
    var tech = player.el().querySelector('.vjs-tech');
    if (tech) {
      tech.removeAttribute('poster');
    }
  },

  // ---------------------------------------------------------------------------
  // Ad Framework
  // ---------------------------------------------------------------------------

  // default framework settings
  defaults = {
    // maximum amount of time in ms to wait to receive `adsready` from the ad
    // implementation after play has been requested. Ad implementations are
    // expected to load any dynamic libraries and make any requests to determine
    // ad policies for a video during this time.
    timeout: 5000,

    // maximum amount of time in ms to wait for the ad implementation to start
    // linear ad mode after `readyforpreroll` has fired. This is in addition to
    // the standard timeout.
    prerollTimeout: 100,

    // when truthy, instructs the plugin to output additional information about
    // plugin state to the video.js log. On most devices, the video.js log is
    // the same as the developer console.
    debug: false
  },

  adFramework = function(options) {
    var
      player = this,

      // merge options and defaults
      settings = extend({}, defaults, options || {}),

      fsmHandler;

    // replace the ad initializer with the ad namespace
    player.ads = {
      state: 'content-set',
      adsDone: false,
      startLinearAdMode: function() {
        player.trigger('adstart');
      },

      endLinearAdMode: function() {
        player.trigger('adend');
      }
    };

    fsmHandler = function(event) {
      // Ad Playback State Machine
      var
        fsm = {
          'content-set': {
            events: {
              'adscanceled': function() {
                this.state = 'content-playback';
              },
              'adsready': function() {
                this.state = 'ads-ready';
              },
              'playing': function() {
                this.state = 'ads-ready?';
                cancelContentPlay(player);
                // remove the poster so it doesn't flash between videos
                removeNativePoster(player);
              },
              'loadeddata': function() {
                this.state = 'ads-ready?';
                cancelContentPlay(player);
                // remove the poster so it doesn't flash between videos
                removeNativePoster(player);
              },
              'loadedmetadata': function() {
                this.state = 'ads-ready?';
                cancelContentPlay(player);
                // remove the poster so it doesn't flash between videos
                removeNativePoster(player);
              },
              'play': function() {
                this.state = 'ads-ready?';
                cancelContentPlay(player);
                // remove the poster so it doesn't flash between videos
                removeNativePoster(player);
              },
              'adserror': function() {
                this.state = 'content-playback';
              }
            }
          },
          'ads-ready': {
            events: {
              'play': function() {
                this.state = 'preroll?';
                cancelContentPlay(player);
              },
              'playing': function() {
                this.state = 'preroll?';
                cancelContentPlay(player);
              },
              'loadeddata': function() {
                this.state = 'preroll?';
                cancelContentPlay(player);
              },
              'loadedmetadata': function() {
                this.state = 'preroll?';
                cancelContentPlay(player);
              },
              'adserror': function() {
                this.state = 'content-playback';
              }
            }
          },
          'preroll?': {
            enter: function() {
              // change class to show that we're waiting on ads
              player.el().className += ' vjs-ad-loading';
              // schedule an adtimeout event to fire if we waited too long
              player.ads.timeout = window.setTimeout(function() {
                player.trigger('adtimeout');
              }, settings.prerollTimeout);
              // signal to ad plugin that it's their opportunity to play a preroll
              player.trigger('readyforpreroll');
            },
            leave: function() {
              window.clearTimeout(player.ads.timeout);
              removeClass(player.el(), 'vjs-ad-loading');
            },
            events: {
              'play': function() {
                cancelContentPlay(player);
              },
              'adstart': function() {
                this.state = 'ad-playback';
                player.el().className += ' vjs-ad-playing';
              },
              'adtimeout': function() {
                this.state = 'content-playback';
              },
              'adserror': function() {
                this.state = 'content-playback';
              }
            }
          },
          'ads-ready?': {
            enter: function() {
              player.el().className += ' vjs-ad-loading';
              player.ads.timeout = window.setTimeout(function() {
                player.trigger('adtimeout');
              }, settings.timeout);
            },
            leave: function() {
              window.clearTimeout(player.ads.timeout);
              removeClass(player.el(), 'vjs-ad-loading');
            },
            events: {
              'play': function() {
                cancelContentPlay(player);
              },
              'adscanceled': function() {
                this.state = 'content-playback';
              },
              'adsready': function() {
                this.state = 'preroll?';
              },
              'adtimeout': function() {
                this.state = 'content-playback';
              },
              'adserror': function() {
                this.state = 'content-playback';
              }
            }
          },
          'ad-playback': {
            enter: function() {
              // capture current player state snapshot (playing, currentTime, src)
              this.snapshot = getPlayerSnapshot(player);
              // remove the poster so it doesn't flash between videos
              removeNativePoster(player);
              // We no longer need to supress play events once an ad is playing.
              // Clear it if we were.
              if (player.ads.cancelPlayTimeout) {
                clearImmediate(player.ads.cancelPlayTimeout);
                player.ads.cancelPlayTimeout = null;
              }
            },
            leave: function() {
              removeClass(player.el(), 'vjs-ad-playing');
              restorePlayerSnapshot(player, this.snapshot);
              if (fsm.triggerevent !== 'adend') {
                //trigger 'adend' as a consistent notification
                //event that we're exiting ad-playback.
                player.trigger('adend');
              }
            },
            events: {
              'adend': function() {
                this.state = 'content-playback';
              },
              'adserror': function() {
                this.state = 'content-playback';
              }
            }
          },
          'content-playback': {
            enter: function() {
              // make sure that any cancelPlayTimeout is cleared
              this.adsDone = true;
              if (player.ads.cancelPlayTimeout) {
                clearImmediate(player.ads.cancelPlayTimeout);
                player.ads.cancelPlayTimeout = null;
              }
              // this will cause content to start if a user initiated
              // 'play' event was canceled earlier.
              player.trigger({
                type: 'contentplayback',
                triggerevent: fsm.triggerevent
              });
            },
            events: {
              // in the case of a timeout, adsready might come in late.
              'adsready': function() {
                player.trigger('readyforpreroll');
              },
              'adstart': function() {
                this.state = 'ad-playback';
                player.el().className += ' vjs-ad-playing';
                // remove the poster so it doesn't flash between videos
                removeNativePoster(player);
              },
              'contentupdate': function() {
                if (this.adsDone) return;
                if (player.paused()) {
                  this.state = 'content-set';
                } else {
                  this.state = 'ads-ready?';
                }
              }
            }
          }
        };

      (function(state) {
        var noop = function() {};

        // process the current event with a noop default handler
        (fsm[state].events[event.type] || noop).apply(player.ads);

        // execute leave/enter callbacks if present
        if (state !== player.ads.state) {
          fsm.triggerevent = event.type;
          (fsm[state].leave || noop).apply(player.ads);
          (fsm[player.ads.state].enter || noop).apply(player.ads);
          if (settings.debug) {
            videojs.log('ads', fsm.triggerevent + ' triggered: ' + state + ' -> ' + player.ads.state);
          }
        }

      })(player.ads.state);

    };

    // register for the events we're interested in
    on(player, vjs.Html5.Events.concat([
      // events emitted by ad plugin
      'adtimeout',
      'contentupdate',
      // events emitted by third party ad implementors
      'adsready',
      'adserror',
      'adscanceled',
      'adstart',  // startLinearAdMode()
      'adend'     // endLinearAdMode()
    ]), fsmHandler);

    // keep track of the current content source
    // if you want to change the src of the video without triggering
    // the ad workflow to restart, you can update this variable before
    // modifying the player's source
    player.ads.contentSrc = player.currentSrc();

    // implement 'contentupdate' event.
    (function(){
      var
        // check if a new src has been set, if so, trigger contentupdate
        checkSrc = function() {
          var src;
          if (player.ads.state !== 'ad-playback') {
            src = player.currentSrc();
            if (src !== player.ads.contentSrc) {
              player.trigger({
                type: 'contentupdate',
                oldValue: player.ads.contentSrc,
                newValue: src
              });
              player.ads.contentSrc = src;
            }
          }
        };
      // loadstart reliably indicates a new src has been set
      player.on('loadstart', checkSrc);
      // check immediately in case we missed the loadstart
      setImmediate(checkSrc);
    })();

    // kick off the fsm
    if (!player.paused()) {
      // simulate a play event if we're autoplaying
      fsmHandler({type:'play'});
    }

  };

  // register the ad plugin framework
  vjs.plugin('ads', adFramework);

});

! function(e) {
    if ("object" == typeof exports) module.exports = e();
    else if ("function" == typeof define && define.amd) define(e);
    else {
        var f;
        "undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.DMVAST = e()
    }
}(function() {
    var define, module, exports;
    return (function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a) return a(o, !0);
                    if (i) return i(o, !0);
                    throw new Error("Cannot find module '" + o + "'")
                }
                var f = n[o] = {
                    exports: {}
                };
                t[o][0].call(f.exports, function(e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, f, f.exports, e, t, n, r)
            }
            return n[o].exports
        }
        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++) s(r[o]);
        return s
    })({
        1: [
            function(_dereq_, module, exports) {
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.

                function EventEmitter() {
                    this._events = this._events || {};
                    this._maxListeners = this._maxListeners || undefined;
                }
                module.exports = EventEmitter;

                // Backwards-compat with node 0.10.x
                EventEmitter.EventEmitter = EventEmitter;

                EventEmitter.prototype._events = undefined;
                EventEmitter.prototype._maxListeners = undefined;

                // By default EventEmitters will print a warning if more than 10 listeners are
                // added to it. This is a useful default which helps finding memory leaks.
                EventEmitter.defaultMaxListeners = 10;

                // Obviously not all Emitters should be limited to 10. This function allows
                // that to be increased. Set to zero for unlimited.
                EventEmitter.prototype.setMaxListeners = function(n) {
                    if (!isNumber(n) || n < 0 || isNaN(n))
                        throw TypeError('n must be a positive number');
                    this._maxListeners = n;
                    return this;
                };

                EventEmitter.prototype.emit = function(type) {
                    var er, handler, len, args, i, listeners;

                    if (!this._events)
                        this._events = {};

                    // If there is no 'error' event listener then throw.
                    if (type === 'error') {
                        if (!this._events.error ||
                            (isObject(this._events.error) && !this._events.error.length)) {
                            er = arguments[1];
                            if (er instanceof Error) {
                                throw er; // Unhandled 'error' event
                            } else {
                                throw TypeError('Uncaught, unspecified "error" event.');
                            }
                            return false;
                        }
                    }

                    handler = this._events[type];

                    if (isUndefined(handler))
                        return false;

                    if (isFunction(handler)) {
                        switch (arguments.length) {
                            // fast cases
                            case 1:
                                handler.call(this);
                                break;
                            case 2:
                                handler.call(this, arguments[1]);
                                break;
                            case 3:
                                handler.call(this, arguments[1], arguments[2]);
                                break;
                                // slower
                            default:
                                len = arguments.length;
                                args = new Array(len - 1);
                                for (i = 1; i < len; i++)
                                    args[i - 1] = arguments[i];
                                handler.apply(this, args);
                        }
                    } else if (isObject(handler)) {
                        len = arguments.length;
                        args = new Array(len - 1);
                        for (i = 1; i < len; i++)
                            args[i - 1] = arguments[i];

                        listeners = handler.slice();
                        len = listeners.length;
                        for (i = 0; i < len; i++)
                            listeners[i].apply(this, args);
                    }

                    return true;
                };

                EventEmitter.prototype.addListener = function(type, listener) {
                    var m;

                    if (!isFunction(listener))
                        throw TypeError('listener must be a function');

                    if (!this._events)
                        this._events = {};

                    // To avoid recursion in the case that type === "newListener"! Before
                    // adding it to the listeners, first emit "newListener".
                    if (this._events.newListener)
                        this.emit('newListener', type,
                            isFunction(listener.listener) ?
                            listener.listener : listener);

                    if (!this._events[type])
                    // Optimize the case of one listener. Don't need the extra array object.
                        this._events[type] = listener;
                    else if (isObject(this._events[type]))
                    // If we've already got an array, just append.
                        this._events[type].push(listener);
                    else
                    // Adding the second element, need to change to array.
                        this._events[type] = [this._events[type], listener];

                    // Check for listener leak
                    if (isObject(this._events[type]) && !this._events[type].warned) {
                        var m;
                        if (!isUndefined(this._maxListeners)) {
                            m = this._maxListeners;
                        } else {
                            m = EventEmitter.defaultMaxListeners;
                        }

                        if (m && m > 0 && this._events[type].length > m) {
                            this._events[type].warned = true;
                            console.error('(node) warning: possible EventEmitter memory ' +
                                'leak detected. %d listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit.',
                                this._events[type].length);
                            console.trace();
                        }
                    }

                    return this;
                };

                EventEmitter.prototype.on = EventEmitter.prototype.addListener;

                EventEmitter.prototype.once = function(type, listener) {
                    if (!isFunction(listener))
                        throw TypeError('listener must be a function');

                    var fired = false;

                    function g() {
                        this.removeListener(type, g);

                        if (!fired) {
                            fired = true;
                            listener.apply(this, arguments);
                        }
                    }

                    g.listener = listener;
                    this.on(type, g);

                    return this;
                };

                // emits a 'removeListener' event iff the listener was removed
                EventEmitter.prototype.removeListener = function(type, listener) {
                    var list, position, length, i;

                    if (!isFunction(listener))
                        throw TypeError('listener must be a function');

                    if (!this._events || !this._events[type])
                        return this;

                    list = this._events[type];
                    length = list.length;
                    position = -1;

                    if (list === listener ||
                        (isFunction(list.listener) && list.listener === listener)) {
                        delete this._events[type];
                        if (this._events.removeListener)
                            this.emit('removeListener', type, listener);

                    } else if (isObject(list)) {
                        for (i = length; i-- > 0;) {
                            if (list[i] === listener ||
                                (list[i].listener && list[i].listener === listener)) {
                                position = i;
                                break;
                            }
                        }

                        if (position < 0)
                            return this;

                        if (list.length === 1) {
                            list.length = 0;
                            delete this._events[type];
                        } else {
                            list.splice(position, 1);
                        }

                        if (this._events.removeListener)
                            this.emit('removeListener', type, listener);
                    }

                    return this;
                };

                EventEmitter.prototype.removeAllListeners = function(type) {
                    var key, listeners;

                    if (!this._events)
                        return this;

                    // not listening for removeListener, no need to emit
                    if (!this._events.removeListener) {
                        if (arguments.length === 0)
                            this._events = {};
                        else if (this._events[type])
                            delete this._events[type];
                        return this;
                    }

                    // emit removeListener for all listeners on all events
                    if (arguments.length === 0) {
                        for (key in this._events) {
                            if (key === 'removeListener') continue;
                            this.removeAllListeners(key);
                        }
                        this.removeAllListeners('removeListener');
                        this._events = {};
                        return this;
                    }

                    listeners = this._events[type];

                    if (isFunction(listeners)) {
                        this.removeListener(type, listeners);
                    } else {
                        // LIFO order
                        while (listeners.length)
                            this.removeListener(type, listeners[listeners.length - 1]);
                    }
                    delete this._events[type];

                    return this;
                };

                EventEmitter.prototype.listeners = function(type) {
                    var ret;
                    if (!this._events || !this._events[type])
                        ret = [];
                    else if (isFunction(this._events[type]))
                        ret = [this._events[type]];
                    else
                        ret = this._events[type].slice();
                    return ret;
                };

                EventEmitter.listenerCount = function(emitter, type) {
                    var ret;
                    if (!emitter._events || !emitter._events[type])
                        ret = 0;
                    else if (isFunction(emitter._events[type]))
                        ret = 1;
                    else
                        ret = emitter._events[type].length;
                    return ret;
                };

                function isFunction(arg) {
                    return typeof arg === 'function';
                }

                function isNumber(arg) {
                    return typeof arg === 'number';
                }

                function isObject(arg) {
                    return typeof arg === 'object' && arg !== null;
                }

                function isUndefined(arg) {
                    return arg === void 0;
                }

            }, {}
        ],
        2: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTAd;

                VASTAd = (function() {
                    function VASTAd() {
                        this.errorURLTemplates = [];
                        this.impressionURLTemplates = [];
                        this.creatives = [];
                        this.adSystem = [];
                    }

                    return VASTAd;

                })();

                module.exports = VASTAd;

            }, {}
        ],
        3: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTClient, VASTParser, VASTUtil;

                VASTParser = _dereq_('./parser.coffee');

                VASTUtil = _dereq_('./util.coffee');

                VASTClient = (function() {
                    function VASTClient() {}

                    VASTClient.cappingFreeLunch = 0;

                    VASTClient.cappingMinimumTimeInterval = 0;

                    VASTClient.timeout = 0;

                    VASTClient.get = function(url, cb) {
                        var now;
                        now = +new Date();
                        if (this.totalCallsTimeout < now) {
                            this.totalCalls = 1;
                            this.totalCallsTimeout = now + (60 * 60 * 1000);
                        } else {
                            this.totalCalls++;
                        }
                        if (this.cappingFreeLunch >= this.totalCalls) {
                            cb(null);
                            return;
                        }
                        if (now - this.lastSuccessfullAd < this.cappingMinimumTimeInterval) {
                            cb(null);
                            return;
                        }
                        return VASTParser.parse(url, (function(_this) {
                            return function(response) {
                                return cb(response);
                            };
                        })(this));
                    };

                    (function() {
                        var defineProperty, storage;
                        storage = VASTUtil.storage;
                        defineProperty = Object.defineProperty;
                        ['lastSuccessfullAd', 'totalCalls', 'totalCallsTimeout'].forEach(function(property) {
                            defineProperty(VASTClient, property, {
                                get: function() {
                                    return storage.getItem(property);
                                },
                                set: function(value) {
                                    return storage.setItem(property, value);
                                },
                                configurable: false,
                                enumerable: true
                            });
                        });
                        if (VASTClient.totalCalls == null) {
                            VASTClient.totalCalls = 0;
                        }
                        if (VASTClient.totalCallsTimeout == null) {
                            VASTClient.totalCallsTimeout = 0;
                        }
                    })();

                    return VASTClient;

                })();

                module.exports = VASTClient;

            }, {
                "./parser.coffee": 8,
                "./util.coffee": 14
            }
        ],
        4: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTCompanionAd;

                VASTCompanionAd = (function() {
                    function VASTCompanionAd() {
                        this.id = null;
                        this.width = 0;
                        this.height = 0;
                        this.type = null;
                        this.staticResource = null;
                        this.companionClickThroughURLTemplate = null;
                        this.trackingEvents = {};
                    }

                    return VASTCompanionAd;

                })();

                module.exports = VASTCompanionAd;

            }, {}
        ],
        5: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTCreative, VASTCreativeCompanion, VASTCreativeLinear, VASTCreativeNonLinear,
                    __hasProp = {}.hasOwnProperty,
                    __extends = function(child, parent) {
                        for (var key in parent) {
                            if (__hasProp.call(parent, key)) child[key] = parent[key];
                        }

                        function ctor() {
                            this.constructor = child;
                        }
                        ctor.prototype = parent.prototype;
                        child.prototype = new ctor();
                        child.__super__ = parent.prototype;
                        return child;
                    };

                VASTCreative = (function() {
                    function VASTCreative() {
                        this.trackingEvents = {};
                    }

                    return VASTCreative;

                })();

                VASTCreativeLinear = (function(_super) {
                    __extends(VASTCreativeLinear, _super);

                    function VASTCreativeLinear() {
                        VASTCreativeLinear.__super__.constructor.apply(this, arguments);
                        this.type = "linear";
                        this.duration = 0;
                        this.skipDelay = null;
                        this.mediaFiles = [];
                        this.videoClicks = {};
                    }

                    return VASTCreativeLinear;

                })(VASTCreative);

                VASTCreativeNonLinear = (function(_super) {
                    __extends(VASTCreativeNonLinear, _super);

                    function VASTCreativeNonLinear() {
                        return VASTCreativeNonLinear.__super__.constructor.apply(this, arguments);
                    }

                    return VASTCreativeNonLinear;

                })(VASTCreative);

                VASTCreativeCompanion = (function() {
                    function VASTCreativeCompanion() {
                        this.type = "companion";
                        this.variations = [];
                    }

                    return VASTCreativeCompanion;

                })();

                module.exports = {
                    VASTCreativeLinear: VASTCreativeLinear,
                    VASTCreativeNonLinear: VASTCreativeNonLinear,
                    VASTCreativeCompanion: VASTCreativeCompanion
                };

            }, {}
        ],
        6: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                module.exports = {
                    client: _dereq_('./client.coffee'),
                    tracker: _dereq_('./tracker.coffee'),
                    parser: _dereq_('./parser.coffee'),
                    util: _dereq_('./util.coffee')
                };

            }, {
                "./client.coffee": 3,
                "./parser.coffee": 8,
                "./tracker.coffee": 10,
                "./util.coffee": 14
            }
        ],
        7: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTMediaFile;

                VASTMediaFile = (function() {
                    function VASTMediaFile() {
                        this.fileURL = null;
                        this.deliveryType = "progressive";
                        this.mimeType = null;
                        this.codec = null;
                        this.bitrate = 0;
                        this.minBitrate = 0;
                        this.maxBitrate = 0;
                        this.width = 0;
                        this.height = 0;
                    }

                    return VASTMediaFile;

                })();

                module.exports = VASTMediaFile;

            }, {}
        ],
        8: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var URLHandler, VASTAd, VASTCompanionAd, VASTCreativeCompanion, VASTCreativeLinear, VASTMediaFile, VASTParser, VASTResponse, VASTUtil,
                    __indexOf = [].indexOf || function(item) {
                        for (var i = 0, l = this.length; i < l; i++) {
                            if (i in this && this[i] === item) return i;
                        }
                        return -1;
                    };

                URLHandler = _dereq_('./urlhandler.coffee');

                VASTResponse = _dereq_('./response.coffee');

                VASTAd = _dereq_('./ad.coffee');

                VASTUtil = _dereq_('./util.coffee');

                VASTCreativeLinear = _dereq_('./creative.coffee').VASTCreativeLinear;

                VASTCreativeCompanion = _dereq_('./creative.coffee').VASTCreativeCompanion;

                VASTMediaFile = _dereq_('./mediafile.coffee');

                VASTCompanionAd = _dereq_('./companionad.coffee');

                VASTParser = (function() {
                    var URLTemplateFilters;

                    function VASTParser() {}

                    URLTemplateFilters = [];

                    VASTParser.addURLTemplateFilter = function(func) {
                        if (typeof func === 'function') {
                            URLTemplateFilters.push(func);
                        }
                    };

                    VASTParser.removeURLTemplateFilter = function() {
                        return URLTemplateFilters.pop();
                    };

                    VASTParser.countURLTemplateFilters = function() {
                        return URLTemplateFilters.length;
                    };

                    VASTParser.clearUrlTemplateFilters = function() {
                        return URLTemplateFilters = [];
                    };

                    VASTParser.parse = function(url, cb) {
                        return this._parse(url, null, function(err, response) {
                            return cb(response);
                        });
                    };

                    VASTParser._parse = function(url, parentURLs, cb) {
                        var filter, _i, _len;
                        for (_i = 0, _len = URLTemplateFilters.length; _i < _len; _i++) {
                            filter = URLTemplateFilters[_i];
                            url = filter(url);
                        }
                        if (parentURLs == null) {
                            parentURLs = [];
                        }
                        parentURLs.push(url);
                        return URLHandler.get(url, (function(_this) {
                            return function(err, xml) {
                                var ad, complete, loopIndex, node, response, _j, _k, _len1, _len2, _ref, _ref1;
                                if (err != null) {
                                    return cb(err);
                                }
                                response = new VASTResponse();
                                if (!(((xml != null ? xml.documentElement : void 0) != null) && xml.documentElement.nodeName === "VAST")) {
                                    return cb();
                                }
                                _ref = xml.documentElement.childNodes;
                                for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                                    node = _ref[_j];
                                    if (node.nodeName === 'Error') {
                                        response.errorURLTemplates.push(_this.parseNodeText(node));
                                    }
                                }
                                _ref1 = xml.documentElement.childNodes;
                                for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                                    node = _ref1[_k];
                                    if (node.nodeName === 'Ad') {
                                        ad = _this.parseAdElement(node);
                                        if (ad != null) {
                                            response.ads.push(ad);
                                        } else {
                                            VASTUtil.track(response.errorURLTemplates, {
                                                ERRORCODE: 101
                                            });
                                        }
                                    }
                                }
                                complete = function() {
                                    var _l, _len3, _ref2;
                                    if (!response) {
                                        return;
                                    }
                                    _ref2 = response.ads;
                                    for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
                                        ad = _ref2[_l];
                                        if (ad.nextWrapperURL != null) {
                                            return;
                                        }
                                    }
                                    if (response.ads.length === 0) {
                                        VASTUtil.track(response.errorURLTemplates, {
                                            ERRORCODE: 303
                                        });
                                        response = null;
                                    }
                                    return cb(null, response);
                                };
                                loopIndex = response.ads.length;
                                while (loopIndex--) {
                                    ad = response.ads[loopIndex];
                                    if (ad.nextWrapperURL == null) {
                                        continue;
                                    }
                                    (function(ad) {
                                        var baseURL, _ref2;
                                        if (parentURLs.length >= 10 || (_ref2 = ad.nextWrapperURL, __indexOf.call(parentURLs, _ref2) >= 0)) {
                                            VASTUtil.track(ad.errorURLTemplates, {
                                                ERRORCODE: 302
                                            });
                                            response.ads.splice(response.ads.indexOf(ad), 1);
                                            complete();
                                            return;
                                        }

                                        if (ad.nextWrapperURL.indexOf('://') === -1 && ad.nextWrapperURL.indexOf('//') !== -1) {
                                            ad.nextWrapperURL = ad.nextWrapperURL.replace(/\s*\/\//g, window.document.location.protocol + "\/\/");
                                        } else if (ad.nextWrapperURL.indexOf('://') === -1) {
                                            baseURL = url.slice(0, url.lastIndexOf('/'));
                                            ad.nextWrapperURL = "" + baseURL + "/" + ad.nextWrapperURL;
                                        }

                                        return _this._parse(ad.nextWrapperURL, parentURLs, function(err, wrappedResponse) {
                                            var creative, eventName, clickHandle, index, wrappedAd, _base = {}, _l, _len3, _len4, _len5, _m, _n, _ref3, _ref4, _ref5;
                                            if (err != null) {
                                                VASTUtil.track(ad.errorURLTemplates, {
                                                    ERRORCODE: 301
                                                });
                                                response.ads.splice(response.ads.indexOf(ad), 1);
                                            } else if (wrappedResponse == null) {
                                                VASTUtil.track(ad.errorURLTemplates, {
                                                    ERRORCODE: 303
                                                });
                                                response.ads.splice(response.ads.indexOf(ad), 1);
                                            } else {
                                                response.errorURLTemplates = response.errorURLTemplates.concat(wrappedResponse.errorURLTemplates);
                                                index = response.ads.indexOf(ad);
                                                response.ads.splice(index, 1);
                                                _ref3 = wrappedResponse.ads;
                                                for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
                                                    wrappedAd = _ref3[_l];
                                                    wrappedAd.errorURLTemplates = ad.errorURLTemplates.concat(wrappedAd.errorURLTemplates);
                                                    wrappedAd.impressionURLTemplates = ad.impressionURLTemplates.concat(wrappedAd.impressionURLTemplates);
                                                    if (ad.trackingEvents != null) {
                                                        _ref4 = wrappedAd.creatives;
                                                        for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
                                                            creative = _ref4[_m];
                                                            _ref5 = Object.keys(ad.trackingEvents);
                                                            for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
                                                                eventName = _ref5[_n];
                                                                try {
                                                                    (_base = creative.trackingEvents)[eventName] || (_base[eventName] = []);
                                                                    creative.trackingEvents[eventName] = creative.trackingEvents[eventName].concat(ad.trackingEvents[eventName]);
                                                                } catch(e) {
                                    
                                                                }

                                                                
                                                            }
                                                        }
                                                    }
                                                    if (ad.videoClicks != null) {
                                                      for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
                                                          creative = _ref4[_m];
                                                          _ref5 = Object.keys(ad.videoClicks);
                                                          for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
                                                              clickHandle = _ref5[_n];
                                                              try {
                                                                  (_base = creative.videoClicks)[clickHandle] || (_base[clickHandle] = []);
                                                                  creative.videoClicks[clickHandle] = creative.videoClicks[clickHandle].concat(ad.videoClicks[clickHandle]);
                                                              } catch(e) {
                                                      
                                                              }

                                                              
                                                          }
                                                      }
                                                    }
                                                    response.ads.splice(index, 0, wrappedAd);
                                                }
                                            }
                                            delete ad.nextWrapperURL;
                                            return complete();
                                        });
                                    })(ad);
                                }
                                return complete();
                            };
                        })(this));
                    };

                    VASTParser.childByName = function(node, name) {
                        var child, _i, _len, _ref;
                        _ref = node.childNodes;
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            child = _ref[_i];
                            if (child.nodeName === name) {
                                return child;
                            }
                        }
                    };

                    VASTParser.childsByName = function(node, name) {
                        var child, childs, _i, _len, _ref;
                        childs = [];
                        _ref = node.childNodes;
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            child = _ref[_i];
                            if (child.nodeName === name) {
                                childs.push(child);
                            }
                        }
                        return childs;
                    };

                    VASTParser.parseAdElement = function(adElement) {
                        var adTypeElement, _i, _len, _ref;
                        _ref = adElement.childNodes;
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            adTypeElement = _ref[_i];
                            if (adTypeElement.nodeName === "Wrapper") {
                                return this.parseWrapperElement(adTypeElement);
                            } else if (adTypeElement.nodeName === "InLine") {
                                return this.parseInLineElement(adTypeElement);
                            }
                        }
                    };

                    VASTParser.parseWrapperElement = function(wrapperElement) {
                        var ad, wrapperCreativeElement, wrapperURLElement;
                        ad = this.parseInLineElement(wrapperElement);
                        wrapperURLElement = this.childByName(wrapperElement, "VASTAdTagURI");
                        if (wrapperURLElement != null) {
                            ad.nextWrapperURL = this.parseNodeText(wrapperURLElement);
                        }
                        wrapperCreativeElement = ad.creatives[0];
                        if (wrapperCreativeElement != null) {
                            if (wrapperCreativeElement.trackingEvents != null) {
                              ad.trackingEvents = wrapperCreativeElement.trackingEvents;
                            }
                            if (wrapperCreativeElement.videoClicks != null) {
                              ad.videoClicks = wrapperCreativeElement.videoClicks;
                            }   
                        }
                        if (ad.nextWrapperURL != null) {
                            return ad;
                        }
                    };

                    VASTParser.parseInLineElement = function(inLineElement) {
                        var ad, creative, creativeElement, creativeTypeElement, node, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
                        ad = new VASTAd();
                        _ref = inLineElement.childNodes;
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            node = _ref[_i];
                            switch (node.nodeName) {
                                case "Error":
                                    ad.errorURLTemplates.push(this.parseNodeText(node));
                                    break;
                                case "AdSystem": 
                                    ad.adSystem.push(this.parseNodeText(node));
                                    break;
                                case "Impression":
                                    ad.impressionURLTemplates.push(this.parseNodeText(node));
                                    break;
                                case "Creatives":
                                    _ref1 = this.childsByName(node, "Creative");
                                    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                                        creativeElement = _ref1[_j];
                                        _ref2 = creativeElement.childNodes;
                                        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                                            creativeTypeElement = _ref2[_k];
                                            switch (creativeTypeElement.nodeName) {
                                                case "Linear":
                                                    creative = this.parseCreativeLinearElement(creativeTypeElement);
                                                    if (creative) {
                                                        ad.creatives.push(creative);
                                                    }
                                                    break;
                                                case "CompanionAds":
                                                    creative = this.parseCompanionAd(creativeTypeElement);
                                                    if (creative) {
                                                        ad.creatives.push(creative);
                                                    }
                                            }
                                        }
                                    }
                            }
                        }
                        return ad;
                    };

                    VASTParser.parseCreativeLinearElement = function(creativeElement) {
                        var creative, eventName, mediaFile, mediaFileElement, mediaFilesElement, adParameters, adParametersData, percent, skipOffset, trackingElement, trackingEventsElement, trackingURLTemplate, videoClicksElement, _base, _i, _j, _k, _l, _m, _len, _len1, _len2, _len3, _len4, _tef, _tef1, _tef2, _ref, _ref1, _ref2, _ref3, _ref4;
                        creative = new VASTCreativeLinear();
                        creative.duration = this.parseDuration(this.parseNodeText(this.childByName(creativeElement, "Duration")));
                        if (creative.duration === -1 && creativeElement.parentNode.parentNode.parentNode.nodeName !== 'Wrapper') {
                            return null;
                        }
                        skipOffset = creativeElement.getAttribute("skipoffset");
                        if (skipOffset == null) {
                            creative.skipDelay = null;
                        } else if (skipOffset.charAt(skipOffset.length - 1) === "%") {
                            percent = parseInt(skipOffset, 10);
                            creative.skipDelay = creative.duration * (percent / 100);
                        } else {
                            creative.skipDelay = this.parseDuration(skipOffset);
                        }
                        videoClicksElement = this.childByName(creativeElement, "VideoClicks");
                        if (videoClicksElement != null) {
                            _tef1 = this.childsByName(videoClicksElement, "ClickThrough");
                            _tef2 = this.childsByName(videoClicksElement, "ClickTracking");
                            creative.videoClicks.clickThrough = [];
                            creative.videoClicks.clickTracking = [];
                            for (_i = 0, _len = _tef1.length; _i < _len; _i++) {
                              trackingElement = _tef1[_i];
                              trackingURLTemplate = this.parseNodeText(trackingElement);
                              creative.videoClicks.clickThrough.push(trackingURLTemplate);
                            }

                            for (_i = 0, _len = _tef2.length; _i < _len; _i++) {
                              trackingElement = _tef2[_i];
                              trackingURLTemplate = this.parseNodeText(trackingElement);
                              creative.videoClicks.clickTracking.push(trackingURLTemplate);
                            }
                            //creative.videoClickThroughURLTemplate = this.parseNodeText(this.childByName(videoClicksElement, "ClickThrough"));
                            //creative.videoClickTrackingURLTemplate = this.parseNodeText(this.childByName(videoClicksElement, "ClickTracking"));
                        }
                        _ref = this.childsByName(creativeElement, "TrackingEvents");
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            trackingEventsElement = _ref[_i];
                            _ref1 = this.childsByName(trackingEventsElement, "Tracking");
                            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                                trackingElement = _ref1[_j];
                                eventName = trackingElement.getAttribute("event");
                                trackingURLTemplate = this.parseNodeText(trackingElement);
                                if ((eventName != null) && (trackingURLTemplate != null)) {
                                    if ((_base = creative.trackingEvents)[eventName] == null) {
                                        _base[eventName] = [];
                                    }
                                    creative.trackingEvents[eventName].push(trackingURLTemplate);
                                }
                            }
                        }
                        _ref2 = this.childsByName(creativeElement, "MediaFiles");
                        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                            mediaFilesElement = _ref2[_k];
                            _ref3 = this.childsByName(mediaFilesElement, "MediaFile");
                            for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
                                mediaFileElement = _ref3[_l];
                                mediaFile = new VASTMediaFile();
                                mediaFile.fileURL = this.parseNodeText(mediaFileElement);
                                mediaFile.deliveryType = mediaFileElement.getAttribute("delivery");
                                mediaFile.codec = mediaFileElement.getAttribute("codec");
                                mediaFile.mimeType = mediaFileElement.getAttribute("type").replace(/x-mp4$/g, 'mp4'); // TuanLDT edit
                                mediaFile.bitrate = parseInt(mediaFileElement.getAttribute("bitrate") || 0);
                                mediaFile.minBitrate = parseInt(mediaFileElement.getAttribute("minBitrate") || 0);
                                mediaFile.maxBitrate = parseInt(mediaFileElement.getAttribute("maxBitrate") || 0);
                                mediaFile.width = parseInt(mediaFileElement.getAttribute("width") || 0);
                                mediaFile.height = parseInt(mediaFileElement.getAttribute("height") || 0);
                                mediaFile.apiFramework = mediaFileElement.getAttribute("apiFramework");
                                creative.mediaFiles.push(mediaFile);
                            }
                        }
                        _ref4 = this.childsByName(creativeElement, "AdParameters");
                        if(_ref4) {
                            creative.adParameters = [];
                            for (_m = 0, _len4 = _ref4.length; _m < _len2; _m++) {
                                adParametersElement = _ref4[_m];
                                //adParameters = this.parseAdParameters(this.parseNodeText(adParametersElement));
                                adParameters = this.parseNodeText(adParametersElement);
                                creative.adParameters.push(adParameters);

                            }
                        }
                        

                        return creative;
                    };

                    VASTParser.parseAdParameters = function(adParametersElement) {
                        var adParameters = this.xmlToJson(this.parseXml(adParametersElement));
                        
                        return adParameters;
                    };

                    /*(function() {

                        if (window.DOMParser) {
                            VASTParser.parseXml = function(xmlStr) {
                                return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
                            };
                        } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
                            VASTParser.parseXml = function(xmlStr) {
                                var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                                xmlDoc.async = "false";
                                xmlDoc.loadXML(xmlStr);
                                return xmlDoc;
                            };
                        } else {
                            VASTParser.parseXml = function() { return null; }
                        }


                    }());

                   VASTParser.xmlToJson = function(xml) {
                        
                        // Create the return object
                        var obj = {};

                        if (xml.nodeType == 1) { // element
                            // do attributes
                            if (xml.attributes.length > 0) {
                                for (var j = 0; j < xml.attributes.length; j++) {
                                    var attribute = xml.attributes.item(j);
                                    obj[attribute.nodeName] = attribute.nodeValue;
                                }
                            }
                        } else if (xml.nodeType == 3) { // text
                            obj = xml.nodeValue;
                        }

                        // do children
                        if (xml.hasChildNodes()) {
                            for(var i = 0; i < xml.childNodes.length; i++) {
                                var item = xml.childNodes.item(i);
                                var nodeName = item.nodeName;
                                if (typeof(obj[nodeName]) == "undefined") {
                                    obj[nodeName] = VASTParser.xmlToJson(item);
                                } else {
                                    if (typeof(obj[nodeName].push) == "undefined") {
                                        var old = obj[nodeName];
                                        obj[nodeName] = [];
                                        obj[nodeName].push(old);
                                    }
                                    obj[nodeName].push(VASTParser.xmlToJson(item));
                                }
                            }
                        }
                        return obj;
                    };*/

                    VASTParser.parseCompanionAd = function(creativeElement) {
                        var companionAd, companionResource, creative, eventName, staticElement, trackingElement, trackingEventsElement, trackingURLTemplate, _base, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3;
                        creative = new VASTCreativeCompanion();
                        _ref = this.childsByName(creativeElement, "Companion");
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            companionResource = _ref[_i];
                            companionAd = new VASTCompanionAd();
                            companionAd.id = companionResource.getAttribute("id") || null;
                            companionAd.width = companionResource.getAttribute("width");
                            companionAd.height = companionResource.getAttribute("height");
                            _ref1 = this.childsByName(companionResource, "StaticResource");
                            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                                staticElement = _ref1[_j];
                                companionAd.type = staticElement.getAttribute("creativeType") || 0;
                                companionAd.staticResource = this.parseNodeText(staticElement);
                            }
                            _ref2 = this.childsByName(companionResource, "TrackingEvents");
                            for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                                trackingEventsElement = _ref2[_k];
                                _ref3 = this.childsByName(trackingEventsElement, "Tracking");
                                for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
                                    trackingElement = _ref3[_l];
                                    eventName = trackingElement.getAttribute("event");
                                    trackingURLTemplate = this.parseNodeText(trackingElement);
                                    if ((eventName != null) && (trackingURLTemplate != null)) {
                                        if ((_base = companionAd.trackingEvents)[eventName] == null) {
                                            _base[eventName] = [];
                                        }
                                        companionAd.trackingEvents[eventName].push(trackingURLTemplate);
                                    }
                                }
                            }
                            companionAd.companionClickThroughURLTemplate = this.parseNodeText(this.childByName(companionResource, "CompanionClickThrough"));
                            creative.variations.push(companionAd);
                        }
                        return creative;
                    };

                    VASTParser.parseDuration = function(durationString) {
                        var durationComponents, hours, minutes, seconds, secondsAndMS;
                        if (!(durationString != null)) {
                            return -1;
                        }
                        durationComponents = durationString.split(":");
                        if (durationComponents.length !== 3) {
                            return -1;
                        }
                        secondsAndMS = durationComponents[2].split(".");
                        seconds = parseInt(secondsAndMS[0]);
                        if (secondsAndMS.length === 2) {
                            seconds += parseFloat("0." + secondsAndMS[1]);
                        }
                        minutes = parseInt(durationComponents[1] * 60);
                        hours = parseInt(durationComponents[0] * 60 * 60);
                        if (isNaN(hours || isNaN(minutes || isNaN(seconds || minutes > 60 * 60 || seconds > 60)))) {
                            return -1;
                        }
                        return hours + minutes + seconds;
                    };

                    VASTParser.parseNodeText = function(node) {
                        return node && (node.textContent || node.text);
                    };

                    return VASTParser;

                })();

                module.exports = VASTParser;

            }, {
                "./ad.coffee": 2,
                "./companionad.coffee": 4,
                "./creative.coffee": 5,
                "./mediafile.coffee": 7,
                "./response.coffee": 9,
                "./urlhandler.coffee": 11,
                "./util.coffee": 14
            }
        ],
        9: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTResponse;

                VASTResponse = (function() {
                    function VASTResponse() {
                        this.ads = [];
                        this.errorURLTemplates = [];
                    }

                    return VASTResponse;

                })();

                module.exports = VASTResponse;

            }, {}
        ],
        10: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var EventEmitter, VASTClient, VASTCreativeLinear, VASTTracker, VASTUtil,
                    __hasProp = {}.hasOwnProperty,
                    __extends = function(child, parent) {
                        for (var key in parent) {
                            if (__hasProp.call(parent, key)) child[key] = parent[key];
                        }

                        function ctor() {
                            this.constructor = child;
                        }
                        ctor.prototype = parent.prototype;
                        child.prototype = new ctor();
                        child.__super__ = parent.prototype;
                        return child;
                    };

                VASTClient = _dereq_('./client.coffee');

                VASTUtil = _dereq_('./util.coffee');

                VASTCreativeLinear = _dereq_('./creative.coffee').VASTCreativeLinear;

                EventEmitter = _dereq_('events').EventEmitter;

                VASTTracker = (function(_super) {
                    __extends(VASTTracker, _super);

                    function VASTTracker(ad, creative) {
                        var eventName, events, _ref;
                        this.ad = ad;
                        this.creative = creative;
                        this.muted = false;
                        this.impressed = false;
                        this.skipable = false;
                        this.skipDelayDefault = -1;
                        this.trackingEvents = {};
                        this.emitAlwaysEvents = ['creativeView', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'rewind', 'skip', 'closeLinear', 'close'];
                        _ref = creative.trackingEvents;
                        for (eventName in _ref) {
                            events = _ref[eventName];
                            this.trackingEvents[eventName] = events.slice(0);
                        }
                        if (creative instanceof VASTCreativeLinear) {
                            this.assetDuration = creative.duration;
                            this.quartiles = {
                                'firstQuartile': 25 / 100,
                                'midpoint': 50 / 100,
                                'thirdQuartile': 75 / 100
                            };
                            this.skipDelay = creative.skipDelay;
                            this.linear = true;
                            this.videoClicks = creative.videoClicks;
                        } else {
                            this.skipDelay = -1;
                            this.linear = false;
                        }
                        this.on('start', function() {
                            VASTClient.lastSuccessfullAd = +new Date();
                        });
                    }

                    VASTTracker.prototype.setProgress = function(progress, duration) {
                        var eventName, events, percent, quartile, skipDelay, time, _i, _len, _ref;
                        skipDelay = this.skipDelay === null ? this.skipDelayDefault : this.skipDelay;
                        if (skipDelay !== -1 && !this.skipable) {
                            if (skipDelay > progress) {
                                this.emit('skip-countdown', skipDelay - progress);
                            } else {
                                this.skipable = true;
                                this.emit('skip-countdown', 0);
                            }
                        }
                        if (this.linear && this.assetDuration > 0) {
                            events = [];
                            if (progress > 0) {
                                events.push("start");
                                percent = Math.round(progress / duration * 100);
                                events.push("progress-" + percent + "%");
                                _ref = this.quartiles;
                                for (quartile in _ref) {
                                    time = Math.round(_ref[quartile] * duration);
                                    if ((time <= progress && progress <= (time + 1))) {
                                        events.push(quartile);
                                    }
                                }
                            }
                            for (_i = 0, _len = events.length; _i < _len; _i++) {
                                eventName = events[_i];
                                this.track(eventName, true);
                            }
                            if (progress < this.progress) {
                                this.track("rewind");
                            }
                        }
                        return this.progress = progress;
                    };

                    VASTTracker.prototype.setMuted = function(muted) {
                        if (this.muted !== muted) {
                            this.track(muted ? "muted" : "unmuted");
                        }
                        return this.muted = muted;
                    };

                    VASTTracker.prototype.setPaused = function(paused) {
                        if (this.paused !== paused) {
                            this.track(paused ? "pause" : "resume");
                        }
                        return this.paused = paused;
                    };

                    VASTTracker.prototype.setFullscreen = function(fullscreen) {
                        if (this.fullscreen !== fullscreen) {
                            this.track(fullscreen ? "fullscreen" : "exitFullscreen");
                        }
                        return this.fullscreen = fullscreen;
                    };

                    VASTTracker.prototype.setSkipDelay = function(duration) {
                        if (typeof duration === 'number') {
                            return this.skipDelay = duration;
                        }
                    };

                    VASTTracker.prototype.load = function() {
                        if (!this.impressed) {
                            this.impressed = true;
                            this.trackURLs(this.ad.impressionURLTemplates);
                            return this.track("creativeView");
                        }
                    };

                    VASTTracker.prototype.errorWithCode = function(errorCode) {
                        return this.trackURLs(this.ad.errorURLTemplates, {
                            ERRORCODE: errorCode
                        });
                    };

                    VASTTracker.prototype.complete = function() {
                        return this.track("complete");
                    };

                    VASTTracker.prototype.stop = function() {
                        return this.track(this.linear ? "closeLinear" : "close");
                    };

                    VASTTracker.prototype.skip = function() {
                        this.track("skip");
                        return this.trackingEvents = [];
                    };

                    // TuanLDT edit --S
                    VASTTracker.prototype.firstQuartile = function() {
                        return this.track("firstQuartile");
                    };

                    VASTTracker.prototype.midpoint = function() {
                        return this.track("midpoint");
                    };

                    VASTTracker.prototype.thirdQuartile = function() {
                        return this.track("thirdQuartile");
                    };

                    // TuanLDT edit --E

                    VASTTracker.prototype.click = function() {
                        var clickTracking, clickThroughURL, variables, _i, _len;
                        if (this.videoClicks != null) {
                            clickTracking = this.videoClicks.clickTracking || [];
                            this.trackURLs(clickTracking);
                        }
                        /*if (this.clickThroughURLTemplate != null) {
                            if (this.linear) {
                                variables = {
                                    CONTENTPLAYHEAD: this.progressFormated()
                                };
                            }
                            clickThroughURL = VASTUtil.resolveURLTemplates([this.clickThroughURLTemplate], variables)[0];
                            return this.emit("clickthrough", clickThroughURL);
                        }*/
                    };

                    VASTTracker.prototype.track = function(eventName, once) {
                        var idx, trackingURLTemplates;
                        if (once == null) {
                            once = false;
                        }
                        if (eventName === 'closeLinear' && ((this.trackingEvents[eventName] == null) && (this.trackingEvents['close'] != null))) {
                            eventName = 'close';
                        }
                        trackingURLTemplates = this.trackingEvents[eventName];
                        idx = this.emitAlwaysEvents.indexOf(eventName);
                        if (trackingURLTemplates != null) {
                            this.emit(eventName, '');
                            this.trackURLs(trackingURLTemplates);
                        } else if (idx !== -1) {
                            this.emit(eventName, '');
                        }
                        if (once === true) {
                            delete this.trackingEvents[eventName];
                            if (idx > -1) {
                                this.emitAlwaysEvents.splice(idx, 1);
                            }
                        }
                    };

                    VASTTracker.prototype.trackURLs = function(URLTemplates, variables) {
                        if (variables == null) {
                            variables = {};
                        }
                        if (this.linear) {
                            variables["CONTENTPLAYHEAD"] = this.progressFormated();
                        }
                        return VASTUtil.track(URLTemplates, variables);
                    };

                    VASTTracker.prototype.progressFormated = function() {
                        var h, m, ms, s, seconds;
                        seconds = parseInt(this.progress);
                        h = seconds / (60 * 60);
                        if (h.length < 2) {
                            h = "0" + h;
                        }
                        m = seconds / 60 % 60;
                        if (m.length < 2) {
                            m = "0" + m;
                        }
                        s = seconds % 60;
                        if (s.length < 2) {
                            s = "0" + m;
                        }
                        ms = parseInt((this.progress - seconds) * 100);
                        return "" + h + ":" + m + ":" + s + "." + ms;
                    };

                    return VASTTracker;

                })(EventEmitter);

                module.exports = VASTTracker;

            }, {
                "./client.coffee": 3,
                "./creative.coffee": 5,
                "./util.coffee": 14,
                "events": 1
            }
        ],
        11: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var URLHandler, flash, xhr;

                xhr = _dereq_('./urlhandlers/xmlhttprequest.coffee');

                flash = _dereq_('./urlhandlers/flash.coffee');

                URLHandler = (function() {
                    function URLHandler() {}

                    URLHandler.get = function(url, cb) {
                        if (typeof window === "undefined" || window === null) {
                            return _dereq_('./urlhandlers/' + 'node.coffee').get(url, cb);
                        } else if (xhr.supported()) {
                            return xhr.get(url, cb);
                        } else if (flash.supported()) {
                            return flash.get(url, cb);
                        } else {
                            return cb();
                        }
                    };

                    return URLHandler;

                })();

                module.exports = URLHandler;

            }, {
                "./urlhandlers/flash.coffee": 12,
                "./urlhandlers/xmlhttprequest.coffee": 13
            }
        ],
        12: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var FlashURLHandler;

                FlashURLHandler = (function() {
                    function FlashURLHandler() {}

                    FlashURLHandler.xdr = function() {
                        var xdr;
                        if (window.XDomainRequest) {
                            xdr = new XDomainRequest();
                        }
                        return xdr;
                    };

                    FlashURLHandler.supported = function() {
                        return !!this.xdr();
                    };

                    FlashURLHandler.get = function(url, cb) {
                        var xdr, xmlDocument;
                        if (xmlDocument = typeof window.ActiveXObject === "function" ? new window.ActiveXObject("Microsoft.XMLDOM") : void 0) {
                            xmlDocument.async = false;
                        } else {
                            return cb();
                        }
                        xdr = this.xdr();
                        xdr.open('GET', url);
                        xdr.send();
                        return xdr.onload = function() {
                            xmlDocument.loadXML(xdr.responseText);
                            return cb(null, xmlDocument);
                        };
                    };

                    return FlashURLHandler;

                })();

                module.exports = FlashURLHandler;

            }, {}
        ],
        13: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var XHRURLHandler;

                XHRURLHandler = (function() {
                    function XHRURLHandler() {}

                    XHRURLHandler.xhr = function() {
                        var xhr;
                        xhr = new window.XMLHttpRequest();
                        if ('withCredentials' in xhr) {
                            return xhr;
                        }
                    };

                    XHRURLHandler.supported = function() {
                        return !!this.xhr();
                    };

                    XHRURLHandler.get = function(url, cb) {
                        var xhr;
                        xhr = this.xhr();
                        xhr.open('GET', url);
                        xhr.send();
                        return xhr.onreadystatechange = function() {
                            if (xhr.readyState === 4) {
                                return cb(null, xhr.responseXML);
                            }
                        };
                    };

                    return XHRURLHandler;

                })();

                module.exports = XHRURLHandler;

            }, {}
        ],
        14: [
            function(_dereq_, module, exports) {
                // Generated by CoffeeScript 1.7.1
                var VASTUtil;

                VASTUtil = (function() {
                    function VASTUtil() {}

                    VASTUtil.track = function(URLTemplates, variables) {
                        var URL, URLs, i, _i, _len, _results;
                        URLs = this.resolveURLTemplates(URLTemplates, variables);
                        _results = [];
                        for (_i = 0, _len = URLs.length; _i < _len; _i++) {
                            URL = URLs[_i];
                            if (typeof window !== "undefined" && window !== null) {
                                i = new Image();
                                _results.push(i.src = URL);
                            } else {

                            }
                        }
                        return _results;
                    };

                    VASTUtil.resolveURLTemplates = function(URLTemplates, variables) {
                        var URLTemplate, URLs, key, macro1, macro2, resolveURL, value, _i, _len;
                        URLs = [];
                        if (variables == null) {
                            variables = {};
                        }
                        if (!("CACHEBUSTING" in variables)) {
                            variables["CACHEBUSTING"] = Math.round(Math.random() * 1.0e+10);
                        }
                        variables["random"] = variables["CACHEBUSTING"];
                        for (_i = 0, _len = URLTemplates.length; _i < _len; _i++) {
                            URLTemplate = URLTemplates[_i];
                            resolveURL = URLTemplate;
                            for (key in variables) {
                                value = variables[key];
                                macro1 = "[" + key + "]";
                                macro2 = "%%" + key + "%%";
                                resolveURL = resolveURL.replace(macro1, value);
                                resolveURL = resolveURL.replace(macro2, value);
                            }
                            URLs.push(resolveURL);
                        }
                        return URLs;
                    };

                    VASTUtil.storage = (function() {
                        var data, isDisabled, storage, storageError;
                        try {
                            storage = typeof window !== "undefined" && window !== null ? window.localStorage || window.sessionStorage : null;
                        } catch (_error) {
                            storageError = _error;
                            storage = null;
                        }
                        isDisabled = function(store) {
                            var e, testValue;
                            try {
                                testValue = '__VASTUtil__';
                                store.setItem(testValue, testValue);
                                if (store.getItem(testValue) !== testValue) {
                                    return true;
                                }
                            } catch (_error) {
                                e = _error;
                                return true;
                            }
                            return false;
                        };
                        if ((storage == null) || isDisabled(storage)) {
                            data = {};
                            storage = {
                                length: 0,
                                getItem: function(key) {
                                    return data[key];
                                },
                                setItem: function(key, value) {
                                    data[key] = value;
                                    this.length = Object.keys(data).length;
                                },
                                removeItem: function(key) {
                                    delete data[key];
                                    this.length = Object.keys(data).length;
                                },
                                clear: function() {
                                    data = {};
                                    this.length = 0;
                                }
                            };
                        }
                        return storage;
                    })();

                    return VASTUtil;

                })();

                module.exports = VASTUtil;

            }, {}
        ]
    }, {}, [6])
    (6)
});

(function(window, vjs, vast) {
  'use strict';

  var extend = function(obj) {
    var arg, i, k;
    for (i = 1; i < arguments.length; i++) {
      arg = arguments[i];
      for (k in arg) {
        if (arg.hasOwnProperty(k)) {
          obj[k] = arg[k];
        }
      }
    }
    return obj;
  },

  defaults = {
    // seconds before skip button shows, negative values to disable skip button altogether
    skip: 6
  }, Vast, vastPlugin;

  vjs.skipButtonAds = vjs.Button.extend({
    init: function(player, options) {
       vjs.Button.call(this, player, options);
       this.hide();
    }
  });

  vjs.skipButtonAds.prototype.createEl = function(){
    return vjs.createEl('div', {
      className: 'vjs-skip-button-ads',
      innerHTML: '<div class="vjs-skip-button-ads-label">Bạn có thể bỏ qua sau:</div><div class="vjs-skip-button-ads-skip-toggle"></div>'
    });
  };
  
  Vast = function (player, settings) {

    // return vast plugin
    return {
      skip: function(skip) {
        if (skip === undefined) {
          return settings.skip;
        } else {
          settings.skip = skip;
        }
      },

      url: function(url) {
        if (url === undefined) {
          return settings.url;
        } else {
          settings.url = url;
        }
      },

      createSourceObjects: function (creative) {
        var sourcesByFormat = {}, i, j, tech;
        var defaultsTech = ['html5', 'flash', 'vpaidflash'];

        var techOrderPlayer = player.options().techOrder;

        var media_files = creative.mediaFiles;
        var adParameters;



        if (creative.adParameters && creative.adParameters[0]) {
          adParameters = creative.adParameters[0];
        }

        var techOrder = [];

        for (i = 0; i< defaultsTech.length; i++) {
          if (techOrderPlayer.indexOf(defaultsTech[i]) !== -1) {
            techOrder.push(defaultsTech[i]);
          }
        }

        for (i = 0, j = techOrder.length; i < j; i++) {
          var techName = techOrder[i].charAt(0).toUpperCase() + techOrder[i].slice(1);
          tech = window.videojs[techName];

          // Check if the current tech is defined before continuing
          if (!tech) {
            continue;
          }

          // Check if the browser supports this technology
          if (tech.isSupported()) {
            // Loop through each source object
            for (var a = 0, b = media_files.length; a < b; a++) {
              var media_file = media_files[a];
              var source = {type:media_file.mimeType, src:media_file.fileURL};

              // Check if source can be played with this technology
              if (tech.canPlaySource(source)) {
                if (sourcesByFormat[techOrder[i]] === undefined) {
                  sourcesByFormat[techOrder[i]] = [];
                }
                sourcesByFormat[techOrder[i]].push({
                  type:media_file.mimeType,
                  src: media_file.fileURL,
                  width: media_file.width,
                  height: media_file.height,
                  adParameters: adParameters
                });
              }
            }
          }
        }
        // Create sources in preferred format order
        var sources = [];
        for (j = 0; j < techOrder.length; j++) {
          tech = techOrder[j];
          if (sourcesByFormat[tech] !== undefined) {
            for (i = 0; i < sourcesByFormat[tech].length; i++) {
              sources.push(sourcesByFormat[tech][i]);
            }
          }
        }
        return sources;
      },

      getContent: function () {

        // query vast url given in settings
        vast.client.get(settings.url, function(response) {
          if (response) {
            // we got a response, deal with it
            for (var adIdx = 0; adIdx < response.ads.length; adIdx++) {
              var ad = response.ads[adIdx];
              player.vast.companion = undefined;
              for (var creaIdx = 0; creaIdx < ad.creatives.length; creaIdx++) {
                var creative = ad.creatives[creaIdx], foundCreative = false, foundCompanion = false;
                if (creative.type === "linear" && !foundCreative) {

                  if (creative.mediaFiles.length) {

                    player.vast.sources = player.vast.createSourceObjects(creative);

                    if (!player.vast.sources.length) {
                      player.trigger('adscanceled');
                      return;
                    }

                    player.vastTracker = new vast.tracker(ad, creative);

                    foundCreative = true;
                  }

                } else if (creative.type === "companion" && !foundCompanion) {

                  player.vast.companion = creative;

                  foundCompanion = true;

                }
              }

              if (player.vastTracker) {
                // vast tracker and content is ready to go, trigger event
                player.trigger('vast-ready');
                break;
              } else {
                // Inform ad server we can't find suitable media file for this ad
                vast.util.track(ad.errorURLTemplates, {ERRORCODE: 403});
              }
            }
          }

          if (!player.vastTracker) {
            // No pre-roll, start video
            player.trigger('adscanceled');
          }
        });
      },

      setupEvents: function() {

        var errorOccurred = false,
            isFirstTime = false,
            canplayFn = function() {
              player.vastTracker.load();
            },
            timeupdateFn = function() {
              if (isNaN(player.vastTracker.assetDuration)) {
                player.vastTracker.assetDuration = player.duration();
              }
              player.vastTracker.setProgress(player.currentTime(), player.duration());
            },
            pauseFn = function() {
              player.vastTracker.setPaused(true);
              player.one('play', function(){
                player.vastTracker.setPaused(false);
              });
            },
            errorFn = function() {
              // Inform ad server we couldn't play the media file for this ad
              vast.util.track(player.vastTracker.ad.errorURLTemplates, {ERRORCODE: 405});
              errorOccurred = true;
              player.trigger('ended');
            },
            impressionFn = function() {
              player.vastTracker.impression();
            },
            firstquartileFn = function() {
              player.vastTracker.firstQuartile();
            },
            midpointFn = function() {
              player.vastTracker.midpoint();
            },
            thirdquartileFn = function() {
              player.vastTracker.thirdQuartile();
            },
            clicktrackingFn = function() {
              player.vastTracker.click();
            },
            hanshakeversionFn = function(evt) {
              var skipButtonAds = new vjs.skipButtonAds(player, {
                timeSkip: 5
              });
              player.addChild(skipButtonAds);
              if (settings.skip < 0) {
                skipButtonAds.hide();
              }
              player.vast.skipButton = skipButtonAds;

              player.on("timeupdate", player.vast.timeupdate);

              skipButtonAds.on(['click','tap'], function(e) {
                if((' ' + player.vast.skipButton.className + ' ').indexOf(' enabled ') >= 0) {
                  player.vastTracker.skip();
                  player.vast.tearDown();
                }
                if(window.Event.prototype.stopPropagation !== undefined) {
                  e.stopPropagation();
                } else {
                  return false;
                }
              });
            },
            completeFn = function(evt) {
                if (errorOccurred) {
                  return;
                }
               player.vastTracker.complete();
            },
            closeFn = function(evt) {
              player.vastTracker.stop();
            };

        //player.one(['play', 'playing'], canplayFn);
        //event vast
        if (player.vast.type != 'VPAID') {
          player.one(['play', 'playing'], canplayFn);
          player.on('timeupdate', timeupdateFn);
          player.one('ended', completeFn);
        } 

        //event vpaid
        player.on('vaststart', canplayFn);
        player.on('vastimpression', canplayFn);
        player.on('vastfirstquartile', firstquartileFn);
        player.on('vastmidpoint', midpointFn);
        player.on('vastthirdquartile', thirdquartileFn);
        player.on('vastclicktracking', clicktrackingFn);
        player.on('vasthanshakeversion', hanshakeversionFn);
        player.on('vastcomplete',completeFn);
        player.on('vastclose',closeFn);
        
    
        player.on('pause', pauseFn);
        player.on('error', errorFn);
        

        player.one('vast-preroll-removed', function() {
          // event vast
          
            player.off('ended', completeFn);
            player.off(['play', 'playing'], canplayFn);
            player.off('timeupdate', timeupdateFn);
          
            // event vpaid
            player.off('vaststart', canplayFn);
            player.off('vastimpression', canplayFn);
            player.off('vastfirstquartile', firstquartileFn);
            player.off('vastmidpoint', midpointFn);
            player.off('vastthirdquartile', thirdquartileFn);
            player.off('vastclicktracking', clicktrackingFn);
            player.off('vasthanshakeversion', hanshakeversionFn);
            player.off('vastcomplete',completeFn);
            player.off('vastclose',closeFn);

            player.off('pause', pauseFn);
            player.off('error', errorFn);
        });
      },
      vastFramework: function() {
        var type = player.currentType();

        var vastreg = /mp4/i;

        if (vastreg.test(type)) {
          return 'VAST';
        };

        return null;
      },
      preroll: function() {
        player.ads.startLinearAdMode();
        player.vast.showControls = player.controls();
        /*if (player.vast.showControls) {
          player.controls(false);
        }*/

        // load linear ad sources and start playing them
        if (!player.paused()) {
          player.autoplay(true);
        }
        player.src(player.vast.sources);

        var clickthrough;
        if (player.vastTracker.videoClicks.clickThrough && player.vastTracker.videoClicks.clickThrough[0]) {
          clickthrough = vast.util.resolveURLTemplates(
            player.vastTracker.videoClicks.clickThrough,
            {
              CACHEBUSTER: Math.round(Math.random() * 1.0e+10),
              CONTENTPLAYHEAD: player.vastTracker.progressFormated()
            }
          )[0];
        }

        var apiFramework = player.vast.vastFramework() || player.vastTracker.creative.mediaFiles[0].apiFramework;
        if (apiFramework == 'VPAID') {  
          player.vast.type = 'VPAID';
          player.one(['play', 'playing'], function() {

            if (player.vast.sources && player.vast.sources[0].src !== player.src()) {
              player.vast.adDone = true;
              player.ads.endLinearAdMode();
              player.trigger('vast-preroll-removed');
              return;
            }
            
            if (player.ads && player.ads.state == 'ad-playback') {
              player.controlBar.hide();
            }
          });
          
        } else {
          var blocker = window.document.createElement("a");
          blocker.className = "vast-blocker";
          blocker.href = clickthrough || "#";
          blocker.target = "_blank";
          blocker.onclick = function() {
            if (player.paused()) {
              player.play();
              return false;
            }
            var clicktrackers = player.vastTracker.videoClicks.clickTracking;
            if (clicktrackers) {
              player.vastTracker.trackURLs(clicktrackers);
            }
            player.trigger("adclick");
          };
          player.vast.blocker = blocker;
          player.el().insertBefore(blocker, player.controlBar.el());

          var skipButtonAds = new vjs.skipButtonAds(player, {
            timeSkip: 5
          });
          player.addChild(skipButtonAds);
          if (settings.skip < 0) {
            skipButtonAds.hide();
          }
          player.vast.skipButton = skipButtonAds;

          player.on("timeupdate", player.vast.timeupdate);

          skipButtonAds.on(['click','tap'], function(e) {
            if((' ' + player.vast.skipButton.className + ' ').indexOf(' enabled ') >= 0) {
              player.vastTracker.skip();
              player.vast.tearDown();
            }
            if(window.Event.prototype.stopPropagation !== undefined) {
              e.stopPropagation();
            } else {
              return false;
            }
          });
        }

        player.vast.setupEvents();

        player.one('ended', player.vast.tearDown);

        player.trigger('vast-preroll-ready');
      },

      tearDown: function() {
        // remove preroll buttons
        if (player.vast.skipButton) {
          player.removeChild(player.vast.skipButton);
        }
        if( player.vast.type != 'VPAID') {
          player.vast.blocker.parentNode.removeChild(player.vast.blocker);
        } else {
           player.controlBar.show();
        }

        // remove vast-specific events
        player.off('timeupdate', player.vast.timeupdate);
        player.off('ended', player.vast.tearDown);

        // end ad mode
        player.vast.adDone = true;
        player.ads.endLinearAdMode();
        player.trigger('vast-preroll-removed');

        // show player controls for video
        /*if (player.vast.showControls) {
          player.controls(true);
        }*/  
      },

      timeupdate: function(e) {
        //player.loadingSpinner.el().style.display = "none";
        var currentTime = player.currentTime(),
          timeLeft =  Math.ceil(settings.skip - currentTime);
        
        if (currentTime <= 0) return;
        if(timeLeft > 0) {
          player.vast.skipButton.show();
          player.vast.skipButton.el().lastChild.innerHTML = timeLeft + " giây";
          player.vast.skipButton.timeLeft = timeLeft;
        } else {
          if(((' ' + player.vast.skipButton.className + ' ').indexOf(' enabled ') === -1) && (player.vast.skipButton.timeLeft)){
            player.vast.skipButton.className += " enabled";
            player.vast.skipButton.el().firstChild.style.display = 'none';
            player.vast.skipButton.el().lastChild.innerHTML = "Bỏ Qua";
          }
        }
      }
    };

  },

  vastPlugin = function(options) {
    var player = this;
    var settings = extend({}, defaults, options || {});
    var adsInit = false;

    // check that we have the ads plugin
    if (player.ads === undefined) {
      window.console.error('vast video plugin requires videojs-contrib-ads, vast plugin not initialized');
      return null;
    }

    // set up vast plugin, then set up events here
    player.vast = new Vast(player, settings);

    var 
      _firstplay = false,
      vast_ready = function() {
        // vast is prepared with content, set up ads and trigger ready function
        player.trigger('adsready');
      },
      vast_preroll_ready_Or_remove = function() {
        // start playing preroll, note: this should happen this way no matter what, even if autoplay
        //  has been disabled since the preroll function shouldn't run until the user/autoplay has
        //  caused the main video to trigger this preroll function

        // preroll done or removed, start playing the actual video
        player.one('play', function() {
          _firstplay = true;
        });
        if (player.autoplay() || _firstplay) {
          player.play();
        }
      },
      vast_contentupdate = function() {
        // videojs-ads triggers this when src changes
        if (player.vast.adDone === true) {
          return;
        }
        player.vast.getContent();
      },
      vast_readyforpreroll = function() {
        // if we don't have a vast url, just bail out
        if (!settings.url) {
          player.trigger('adscanceled');
          return null;
        }

        if (player.vast.adDone === true) {
          return null;
        }
        // set up and start playing preroll
        adsInit = true;
        player.vast.preroll();
      };

    player.one('vast-ready', vast_ready);
    player.one('vast-preroll-ready', vast_preroll_ready_Or_remove);
    player.one('vast-preroll-removed', vast_preroll_ready_Or_remove);
    player.one('contentupdate', vast_contentupdate);
    player.one('readyforpreroll', vast_readyforpreroll);

    player.one('vast-init-timeout', function() {
      player.off('vast-ready', vast_ready);
      player.off('vast-preroll-ready', vast_preroll_ready_Or_remove);
      player.off('vast-preroll-removed', vast_preroll_ready_Or_remove);
      player.off('contentupdate', vast_contentupdate);
      player.off('readyforpreroll', vast_readyforpreroll);
    });

    /*setTimeout(function() {
      if (!adsInit) {
        player.trigger('vast-init-timeout');
      }
    }, 3000);*/

    // make an ads request immediately so we're ready when the viewer hits "play"
    if (player.currentSrc()) {
      player.vast.getContent();
    }

    // return player to allow this plugin to be chained
    return player;
  };

  vjs.plugin('vast', vastPlugin);

}(window, videojs, DMVAST));

(function(window, vjs) {

	vjs.Vpaidflash = vjs.Flash.extend({
		init: function(player, options, ready) {
			var source = options.source,
				settings = player.options();

			player.vpaidflash = this;
    		delete options.source;

			options.swf = settings.vpaidswf || 'http://s.vcplayer.vcmedia.vn/skin/vpaid.swf';
			vjs.Flash.call(this, player, options, ready);
			options.source = source;
			vjs.Vpaidflash.prototype.src.call(this, options.source && options.source.src);
			player.on('vastloaded', vjs.bind(this, this.onAdsLoaded));

		}
	});

	// Add HLS to the standard tech order
	vjs.options.techOrder.push('vpaidflash');

	vjs.Vpaidflash.prototype.src = function(src) {
	  var
	    tech = this,
	    source;

	  // do nothing if the src is falsey
	  if (!src) {
	    return this.src_;
	  }

	  this.src_ = src;
	  // TuanLDT add -E

	  this.ready(function() {
	    // do nothing if the tech has been disposed already
	    // this can occur if someone sets the src in player.ready(), for instance
	    var tech = this;
	    var player = this.player();
	    if (!tech || !tech.el()) {
	      return;
	    }

	    if (player.vast && player.vast.sources) {

	      var sources = player.vast.sources;

	      var sourceObject;

	      vjs.arr.forEach(sources, function(srcObj) {
	        if (srcObj.src === src) {
	          sourceObject = srcObj;
	        }
	      }, this);

	      if (sourceObject) {
	        tech.el().vjs_setProperty('adParameters', sourceObject.adParameters);
	        //console.log('adParameters %s', sourceObject.adParameters);
	        tech.el().vjs_setProperty('duration', sourceObject.duration);
	        //console.log('duration %s', sourceObject.duration);
	        tech.el().vjs_setProperty('bitrate', sourceObject.bitrate);
	        //console.log('bitrate %s', sourceObject.bitrate);
	        tech.el().vjs_setProperty('width', sourceObject.width);
	        //console.log('width %s', sourceObject.width);
	        tech.el().vjs_setProperty('height', sourceObject.height);
	        //console.log('height %s', sourceObject.height);

	        //this.player_.duration(sourceObject.duration);
	        //this.trackCurrentTime();
	      }
	    }

	    // Make sure source URL is absolute.
	    src = vjs.getAbsoluteURL(src);
	    tech.el().vjs_src(src);

	    // Currently the SWF doesn't autoplay if you load a source later.
	    // e.g. Load player w/ no source, wait 2s, set src.
	    if (player.autoplay()) {
	      tech.setTimeout(function(){ tech.play(); }, 0);
	    }
	    //tech.el().vjs_src(src);
	  });
	};

	/*vjs.Vpaidflash.prototype.play = function() {
	  // delegate back to the Flash implementation
	  return vjs.Flash.prototype.play.apply(this, arguments);
	};*/

	vjs.Vpaidflash.prototype.onAdsLoaded = function() {
		var tech = this;
		var player = tech.player();
		if (player.autoplay()) {
			player.play();
		}
	}

	vjs.Vpaidflash.prototype.play = function() {
		var tech = this;
		var player = this.player();
		tech.el_.vjs_startAd();
		player.trigger('play');
		player.trigger('waitting');
	}

	vjs.Vpaidflash.prototype.dispose = function() {
	  vjs.Flash.prototype.dispose.call(this);
	};

  	vjs.Flash['onEvent'] = function(swfID, eventName, data){
		//console.log('ON EVENT', swfID, eventName, data);
		var player = vjs.el(swfID)['player'];
	    if (typeof data != 'underfined') {
	      player.trigger({type: eventName, data: data});
	      return;
	    }
		player.trigger(eventName);
	};

	vjs.Vpaidflash.isSupported = function(){
	    return vjs.Flash.isSupported();
	 };

	vjs.Vpaidflash.canPlaySource = function(source) {
		var type;

		if (!source.type) {
			return '';
		}

		// Strip code information from the type because we don't get that specific
		type = source.type.replace(/;.*/,'').toLowerCase();

		if (type in vjs.Vpaidflash.formats) {
			return 'maybe';
		}

		return '';
	};

	 vjs.Vpaidflash.formats = {
		'application/x-shockwave-flash': 'swf'
	};
})(window, videojs);