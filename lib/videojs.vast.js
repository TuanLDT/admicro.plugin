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
        if (player.vastTracker.videoClicks.clickThrough) {
          clickthrough = vast.util.resolveURLTemplates(
            player.vastTracker.videoClicks.clickThrough,
            {
              CACHEBUSTER: Math.round(Math.random() * 1.0e+10),
              CONTENTPLAYHEAD: player.vastTracker.progressFormated()
            }
          )[0];
        }
        var apiFramework = player.vastTracker.creative.mediaFiles[0].apiFramework;
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
