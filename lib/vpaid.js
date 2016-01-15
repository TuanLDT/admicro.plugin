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