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
