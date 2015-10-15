/*! stats.plugin - v0.0.0 - 2015-03-26
* Copyright (c) 2015 Le Dac Thanh Tuan; Licensed Apache-2.0 */
(function(J,r,f){function s(a,b,d){a.addEventListener?a.addEventListener(b,d,!1):a.attachEvent("on"+b,d)}function A(a){if("keypress"==a.type){var b=String.fromCharCode(a.which);a.shiftKey||(b=b.toLowerCase());return b}return h[a.which]?h[a.which]:B[a.which]?B[a.which]:String.fromCharCode(a.which).toLowerCase()}function t(a){a=a||{};var b=!1,d;for(d in n)a[d]?b=!0:n[d]=0;b||(u=!1)}function C(a,b,d,c,e,v){var g,k,f=[],h=d.type;if(!l[a])return[];"keyup"==h&&w(a)&&(b=[a]);for(g=0;g<l[a].length;++g)if(k=
l[a][g],!(!c&&k.seq&&n[k.seq]!=k.level||h!=k.action||("keypress"!=h||d.metaKey||d.ctrlKey)&&b.sort().join(",")!==k.modifiers.sort().join(","))){var m=c&&k.seq==c&&k.level==v;(!c&&k.combo==e||m)&&l[a].splice(g,1);f.push(k)}return f}function K(a){var b=[];a.shiftKey&&b.push("shift");a.altKey&&b.push("alt");a.ctrlKey&&b.push("ctrl");a.metaKey&&b.push("meta");return b}function x(a,b,d,c){m.stopCallback(b,b.target||b.srcElement,d,c)||!1!==a(b,d)||(b.preventDefault?b.preventDefault():b.returnValue=!1,b.stopPropagation?
b.stopPropagation():b.cancelBubble=!0)}function y(a){"number"!==typeof a.which&&(a.which=a.keyCode);var b=A(a);b&&("keyup"==a.type&&z===b?z=!1:m.handleKey(b,K(a),a))}function w(a){return"shift"==a||"ctrl"==a||"alt"==a||"meta"==a}function L(a,b,d,c){function e(b){return function(){u=b;++n[a];clearTimeout(D);D=setTimeout(t,1E3)}}function v(b){x(d,b,a);"keyup"!==c&&(z=A(b));setTimeout(t,10)}for(var g=n[a]=0;g<b.length;++g){var f=g+1===b.length?v:e(c||E(b[g+1]).action);F(b[g],f,c,a,g)}}function E(a,b){var d,
c,e,f=[];d="+"===a?["+"]:a.split("+");for(e=0;e<d.length;++e)c=d[e],G[c]&&(c=G[c]),b&&"keypress"!=b&&H[c]&&(c=H[c],f.push("shift")),w(c)&&f.push(c);d=c;e=b;if(!e){if(!p){p={};for(var g in h)95<g&&112>g||h.hasOwnProperty(g)&&(p[h[g]]=g)}e=p[d]?"keydown":"keypress"}"keypress"==e&&f.length&&(e="keydown");return{key:c,modifiers:f,action:e}}function F(a,b,d,c,e){q[a+":"+d]=b;a=a.replace(/\s+/g," ");var f=a.split(" ");1<f.length?L(a,f,b,d):(d=E(a,d),l[d.key]=l[d.key]||[],C(d.key,d.modifiers,{type:d.action},
c,a,e),l[d.key][c?"unshift":"push"]({callback:b,modifiers:d.modifiers,action:d.action,seq:c,level:e,combo:a}))}var h={8:"backspace",9:"tab",13:"enter",16:"shift",17:"ctrl",18:"alt",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"ins",46:"del",91:"meta",93:"meta",224:"meta"},B={106:"*",107:"+",109:"-",110:".",111:"/",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"},H={"~":"`","!":"1",
"@":"2","#":"3",$:"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0",_:"-","+":"=",":":";",'"':"'","<":",",">":".","?":"/","|":"\\"},G={option:"alt",command:"meta","return":"enter",escape:"esc",mod:/Mac|iPod|iPhone|iPad/.test(navigator.platform)?"meta":"ctrl"},p,l={},q={},n={},D,z=!1,I=!1,u=!1;for(f=1;20>f;++f)h[111+f]="f"+f;for(f=0;9>=f;++f)h[f+96]=f;s(r,"keypress",y);s(r,"keydown",y);s(r,"keyup",y);var m={bind:function(a,b,d){a=a instanceof Array?a:[a];for(var c=0;c<a.length;++c)F(a[c],b,d);return this},
unbind:function(a,b){return m.bind(a,function(){},b)},trigger:function(a,b){if(q[a+":"+b])q[a+":"+b]({},a);return this},reset:function(){l={};q={};return this},stopCallback:function(a,b){return-1<(" "+b.className+" ").indexOf(" mousetrap ")?!1:"INPUT"==b.tagName||"SELECT"==b.tagName||"TEXTAREA"==b.tagName||b.isContentEditable},handleKey:function(a,b,d){var c=C(a,b,d),e;b={};var f=0,g=!1;for(e=0;e<c.length;++e)c[e].seq&&(f=Math.max(f,c[e].level));for(e=0;e<c.length;++e)c[e].seq?c[e].level==f&&(g=!0,
b[c[e].seq]=1,x(c[e].callback,d,c[e].combo,c[e].seq)):g||x(c[e].callback,d,c[e].combo);c="keypress"==d.type&&I;d.type!=u||w(a)||c||t(b);I=g&&"keydown"==d.type}};J.Mousetrap=m;"function"===typeof define&&define.amd&&define(m)})(window,document);

/*! stats.plugin - v0.0.0 - 2015-3-23
 * Copyright (c) 2015 Le Dac Thanh Tuan
 * Licensed under the Apache-2.0 license. */
(function($, videojs, Mousetrap, navigator) {
  'use strict';

  navigator.sayswho = (function(){
      var ua = navigator.userAgent, tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if(/trident/i.test(M[1])){
          tem =  /\brv[ :]+(\d+)/g.exec(ua) || [];
          return 'IE '+(tem[1] || '');
      }
      if(M[1]=== 'Chrome'){
          tem = ua.match(/\bOPR\/(\d+)/);
          if(tem !== null) {
            return 'Opera '+tem[1];
          }
      }
      M = M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
      if((tem = ua.match(/version\/(\d+)/i)) !== null) {
        M.splice(1, 1, tem[1]);
      }
      return M.join(' ');
  })();

  var defaults = {
        option: true,
        display: false,
        logging: false,
        statsId: ''
      },
      statsPlugin;

  /**
   * Initialize the plugin.
   * @param options (optional) {object} configuration for the plugin
   */
  statsPlugin = function(options) {
    var settings = videojs.util.mergeOptions(defaults, options), player = this;
    var stats = player.stats = statSingleton(settings, player);
        stats.render();
        stats.addListeners();
    //videojs.StatsDisplay();
    // TODO: write some amazing plugin code
  };

  var spanTemplate = _.template('<span><%= key %> : <%= value %></span>');

  var Stats = function(settings, player) {
    var userID;

    if (typeof(Storage) !== 'undefined') {
        userID = localStorage.getItem('sohatvID');
        if (!userID) {
          userID = this.generateUUID();
          localStorage.setItem('sohatvID', userID);
        }
    } else {
      userID = localStorage.getItem('sohatvID');
    }

    this.player_ = player;
    this.template = {
        'stats': _.template('<div data-p2phlsstats class="p2phlsstats"><p>sohatv stats</p><%= span %><div>'),
      CSS: {
        'stats': '@font-face{font-family:StatsFont;src:url(http://cdn.clappr.io/bemtv/latest/assets/visitor.eot);src:url(http://cdn.clappr.io/bemtv/latest/assets/visitor.eot?#iefix) format("embedded-opentype"),url(http://cdn.clappr.io/bemtv/latest/assets/visitor.ttf) format("truetype"),url(http://cdn.clappr.io/bemtv/latest/assets/visitor.svg#player) format("svg")}.p2phlsstats[data-p2phlsstats]{font-family:StatsFont;position:absolute;text-align:left;z-index:9999;top:20px;left:20px;font-smooth:never;-webkit-font-smoothing:none;background-color:rgba(0,0,0,.7);color:#fff;border-radius:3px;width:155px;height:203px;padding-top:11px;font-size:10px;padding-left:5px}.p2phlsstats[data-p2phlsstats] p{color:#fff;text-align:center;margin-bottom:5px}.p2phlsstats[data-p2phlsstats] span{color:#fff;display:block;text-align:left;margin-bottom:3px;line-height:1em}.p2phlsstats[data-p2phlsstats] span.stats-status{display:inline}',
      
      }
    };
    this.state = {
      fReport: 0, // Flag ghi lại vị trí vừa send log;
    };

    this.settings = settings;
    this.metrics = {
      userID: userID,
      src: '',
      browser: navigator.sayswho,
      tech_name: '',
      seek: 0,
      current_time: 0,
      duration: 0,
    };
    this.recordReport = {
      userID: userID,
      src: '',
      techName: '',
      seek: [],
      tsTimeOut: {},
      loading: [],
      duration: 0,
    };

    this.adsReport = {
      userID: userID,
      src: '',
      skipAdd: 0,
      waitting: {}
    };

    this.error =  [];

    if (this.settings.logSoha) {
      this.settings.logURL = this.settings.logAdsURL = this.settings.errorURL = this.settings.logSoha;
    }
  };

  Stats.prototype.render = function() {
    var player = this.player();
    var stats = this;
    var videoWrapper = $(player.el());
    var span = '';
    var style = $('<style class="adSoha-style"></style>').html(stats.template.CSS.stats)[0];
    //stats.$el = $(stats.template.stats(stats.metrics));
    _.map(stats.metrics, function(value, key) {
      span += spanTemplate({value: value, key: key}).replace(/_/g, ' ');
    });
    stats.$el = $('<div class="sohatv-stats"></div>').html(stats.template.stats({span: span}));
    if (!stats.settings.display) {
      stats.hide();
    }
    videoWrapper.append(style);
    videoWrapper.append(stats.$el);
  };

  Stats.prototype.addListeners = function() {
    var player = this.player();
    var stats = this;
    Mousetrap.bind(['command+shift+s+v', 'ctrl+shift+s+v'], videojs.bind(this, this.showOrHide));

    if (stats.settings.logging && (stats.settings.logAdsURL || stats.settings.logURL) || stats.settings.display) {
      player.on('durationchange', videojs.bind(this, this.onStatsReport));
      player.on('play', videojs.bind(this, this.onStatsReport));
      player.on('seeking', videojs.bind(this, this.onStatsReport));
      player.on('seeked', videojs.bind(this, this.onStatsReport));
      player.on('timeupdate', videojs.bind(this, this.onStatsReport));
      player.on('waiting', videojs.bind(this, this.onStatsReport));
      player.on('ended', videojs.bind(this, this.onStatsReport));
    }

    if (stats.settings.logging && stats.settings.logAdsURL) {
      player.on('skipAds', videojs.bind(this, this.onStatsReport));
    }
    if (stats.settings.errorURL) {
      player.on('error', videojs.bind(this, this.sendError));
    }
  };

  Stats.prototype.showOrHide = function() {
    var stats = this;
    if (!stats.$el.hasClass('vjs-hidden')) {
      stats.hide();
    } else {
      stats.show();
    }
  };

  Stats.prototype.onStatsReport = function(report) {
    var player = this.player();
    var stats = this;
    var tech = player.tech;
    var metrics = stats.metrics;
    var record = {};
    var send = {};
    var data = {};
    var isAds = stats.ads();
    var timeBuffering = 0;

    var sendReport = [20, 40, 60, 80];

    if (isAds) {
      record = stats.adsReport;
      send = stats.sendStatsAds.bind(stats);
    } else {
      record = stats.recordReport;
      send = stats.sendStats.bind(stats);
    }

    switch (report.type) {
      case 'timeupdate':
        var currentTime = record.currentTime = player.currentTime().toFixed(2);
        var duration = player.player();
        var buffered = record.buffered = (player.buffered().end(0) - player.currentTime()).toFixed(2);

        metrics.current_time = currentTime;
        metrics.buffered = record.buffered;
        if (isAds) {
          return;
        }
        record.techName = player.techName;
        metrics.tech_name = player.techName;
        switch (player.techName) {
          //case 'Hls':
          case 'HlSoha': {
            var bandwidth = Math.ceil(tech.bandwidth / 8 / 1024);
            record.minBandwidth = record.minBandwidth || bandwidth;
            record.maxBandwidth = record.maxBandwidth || bandwidth;
            
            metrics.minBandwidth = record.minBandwidth = record.minBandwidth > bandwidth && bandwidth !== 1 ? bandwidth: record.minBandwidth;
            metrics.maxBandwidth = record.maxBandwidth = record.maxBandwidth < bandwidth ? bandwidth : record.maxBandwidth;

            metrics.bytesReceived = record.bytesReceived = tech.bytesReceived;
            metrics.type = record.type = tech.typeToString();
            if (currentTime > 0 && currentTime < duration && Math.abs(buffered) < 0.5 && Math.abs(currentTime - timeBuffering) > 10) {
              timeBuffering = currentTime;
              var seg = tech.playlists.media().segments[tech.mediaIndex];

              if (seg) {
                record.loading.push({currentTime: currentTime,segment: seg});
              }
            }

            break;
          }
        }

        var playPercent = Math.ceil(100 * currentTime / duration);
        if (sendReport.indexOf(playPercent) !== -1 && stats.state.fReport !== playPercent) {
          stats.state.fReport = playPercent;
          send();
        }
        break;
      case 'waiting':
        if (isAds) {
          return;
        }
        break;
      case 'seeked':
        if (isAds) {
          return;
        }
        switch (player.techName) {
          case 'Hls':
          case 'HlSoha':
            data.currentTime = player.currentTime();
            data.segment = tech.playlists.media().segments[tech.mediaIndex];
            break;
          case 'Html5':
            data.currentTime = player.currentTime();
            break;
        }
        record.seek.push(data);
        metrics.seek = record.seek.length;
        break;
      case 'play':
        record.src = player.currentSrc();

        metrics.duration = record.duration = player.duration().toFixed(2);
        metrics.src = record.src.split('/').pop();
        send();
        break;
      case 'ended':
        send();
        break;
      case 'skipAds':
        record.skipAdd ++;
        break;
    }
    stats.updateMetrics();
  };

  Stats.prototype.show = function() {
    this.$el.removeClass('vjs-hidden');
  };

  Stats.prototype.player = function() {
    return this.player_;
  };

  Stats.prototype.hide = function() {
    this.$el.addClass('vjs-hidden');
  };

  Stats.prototype.updateMetrics = function() {
    var stats = this;
    var span ='';
    _.map(stats.metrics, function(value, key) {
      span += spanTemplate({value: value, key: key}).replace(/_/g, ' ');
    });

    this.$el.html(stats.template.stats({span: span}));
  };

  Stats.prototype.generateUUID = function() {
     var d = new Date().getTime();
     var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
     });
     return uuid;
  };

  Stats.prototype.sendStats = function() {
      if (!this.settings.logURL) {
        return;
      }
      var queryString = '?log=' + JSON.stringify(this.recordReport);
      var url = this.settings.logURL + queryString;
      $.ajax({url: url});
  };

  Stats.prototype.sendStatsAds = function() {
       if (!this.settings.logAdsURL) {
        return;
      }
      var queryString = '?logAds=' + JSON.stringify(this.adsReport);
      var url = this.settings.logAdsURL + queryString;
      $.ajax({url: url});
  };

  Stats.prototype.sendError = function() {
    var player = this.player();
    var stats = this;

    stats.error.push(player.error_);

    var queryString = '?error=' + JSON.stringify(stats.adsReport);
    var url = this.settings.errorURL + queryString;
    $.ajax({url: url});
  };

  Stats.prototype.ads = function() {
    var player = this.player();
    if (typeof player.ads !== 'object') {
      return false;
    }

    var snapshot = player.ads.snapshot || {};
    if (snapshot.src === player.currentSrc()) {
      return false;
    }

    return true;
  };

  function statSingleton(settings, player) {
    var singleton;
    if (!singleton) {
      singleton = new Stats(settings, player);
    }
    return singleton;
  }

  // register the plugin
  videojs.plugin('stats', statsPlugin);
})(jQuery, window.videojs, window.Mousetrap, window.navigator);
