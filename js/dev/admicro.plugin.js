/*! admicro.plugin - v1.0.0 - 2015-03-20
* Copyright (c) 2015 Le Dac Thanh Tuan; 
* Licensed Apache-2.0 */
(function(window, sohatv) {
  'use strict';

  var defaults = {
    // settting defaults
    
  }, admicroPlugin;

  /**
   * Initialize the plugin.
   *
   * @param options
   *            (optional) {object} configuration for the plugin
   */
  admicroPlugin = function(options) {
    var time = new Date().getTime();
    var 
      //src = 'http://123.30.242.123:3000/test1/adsHD.mp4',
      markers = [
                  {
                    time: 0,
                    text: "0:0",
                    type: "video/mp4",
                    options: {
                      src: "http://123.30.242.123:3000/test1/adsHD.mp4"
                    }
                  },
                 {
                    time: 720,
                    text: "12:00",
                    type: "image",
                    options: {
                      position: 'top-left',
                      src: "http://img2.blog.zdn.vn/66002569.jpg",
                      displayTime: 3000,
                    }
                 },
                 {
                    time: 350,
                    text: "5:50",
                    type: "image",
                    options: {
                      position: 'top-right',
                      src: "https://pbs.twimg.com/profile_images/1327896627/Soha_Game_logo_square__black__400x400.jpg",
                      displayTime: 3000,
                    }
                 },
                 {
                    time: 923,
                    text: "15:23",
                    type: "image",
                    options: {
                      position: 'top-right',
                      src: "http://sohanews2.vcmedia.vn/2013/soha-game-1367915729824.jpg",
                      displayTime: 3000,
                    }
                 }
              ],
      vast = {
      //url: 'assets/multi_source.xml'
      url: 'assets/new.xml'
        
      } 
      return {markers: markers,vast: vast};
  
  };

  // register the plugin
  videojs.plugin('admicro', admicroPlugin);
})(window, window.sohatv);