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
        //url: 'http://lg.logging.admicro.vn/proxy?p=2;1;0;1;0;0;2763;5;0;afamily.vn&path=/nhung-chieu-nho-rang-cho-con-chi-cac-ong-bo-ba-me-ba-dao-moi-nghi-ra-20160608123245631.chn?r=1465375215835'
        //url: 'http://adi.vcmedia.vn/adt/cpc/tvcads/files/xml/0616/WarcraftVPAID.xml'
        //url: 'http://adi.vcmedia.vn/adt/cpc/tvcads/files/xml/0116/363436_vast_1452850116.xml'
        url: 'assets/multi_source.xml'
        //url: 'assets/vast.xml'
        //url: 'assets/tidaltv.xml'
        //url: 'assets/tidaltv_skip_error.xml'
       //url: 'assets/tidaltv_skip.xml'
        //url: 'assets/vast12.xml'
        //url: 'assets/vpaid.xml',
        //url: 'assets/vpaidExample.xml'
        //url: 'http://ad3.liverail.com/?LR_PUBLISHER_ID=1331&LR_CAMPAIGN_ID=229&LR_SCHEMA=vast2',
        //url: 'http://lg.logging.admicro.vn/proxy?p=2;1;0;1;0;3;2760;2,5;0;autopro.com.vn&path=/video.chn?r=' + time
      } 
      return {markers: markers,vast: vast};
  
  };

  // register the plugin
  videojs.plugin('admicro', admicroPlugin);
})(window, window.sohatv);