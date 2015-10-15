/**
 * @fileoverview VideoJS-SWF - Custom Flash Player with HTML5-ish API
 * https://github.com/zencoder/video-js-swf
 * Not using setupTriggers. Using global onEvent func to distribute events
 */

/**
 * VPAID Flash Media Controller - Wrapper for fallback SWF API
 *
 * @param {vjs.Player} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
(function(window, vjs) {

  var hasOwnProp = Object.prototype.hasOwnProperty;
  var merge = function(obj1, obj2){
  if (!obj2) { return obj1; }
  for (var key in obj2){
    if (hasOwnProp.call(obj2, key)) {
      obj1[key] = obj2[key];
    }
  }
  return obj1;
  };

  var insertFirst = function(child, parent){
    if (parent.firstChild) {
      parent.insertBefore(child, parent.firstChild);
    } else {
      parent.appendChild(child);
    }
  };

  var each = function(obj, fn, context){
    for (var key in obj) {
      if (hasOwnProp.call(obj, key)) {
        fn.call(context || this, key, obj[key]);
      }
    }
  };

  vjs.Vpaidflash = vjs.MediaTechController.extend({
    /** @constructor */
    init: function(player, options, ready){
      
      console.log('flash init!');
        console.log('player', player);
        console.log('options', options);
        console.log('ready', ready);
        options.swf = options.swf || 'http://s.vcplayer.vcmedia.vn/skin/vpaid.swf';

        vjs.MediaTechController.call(this, player, options, ready);

        var source = options.source,

            // Which element to embed in
            parentEl = options.parentEl,

            // Create a temporary element to be replaced by swf object
            placeHolder = this.el_ = vjs.Component.prototype.createEl('div', { id: player.id() + '_temp_vpaidflash' }),

            // Generate ID for swf object
            objId = player.id()+'_vpaidflash_api',

            // Store player options in local var for optimization
            // TODO: switch to using player methods instead of options
            // e.g. player.autoplay();
            playerOptions = options,

            // Merge default flashvars with ones passed in to init
            flashVars = merge({

                // SWF Callback Functions
                'readyFunction': 'vjs.Vpaidflash.onReady',
                'eventProxyFunction': 'vjs.Vpaidflash.onEvent',
                'errorEventProxyFunction': 'vjs.Vpaidflash.onError',

                // Player Settings
                'autoplay': playerOptions.autoplay,
                'preload': playerOptions.preload,
                'loop': playerOptions.loop,
                'muted': playerOptions.muted
            }, options.flashVars),

            // Merge default parames with ones passed in
            params = merge({
                'wmode': 'opaque', // Opaque is needed to overlay controls, but can affect playback performance
                'bgcolor': '#000000' // Using bgcolor prevents a white flash when the object is loading
            }, options.params),

            // Merge default attributes with ones passed in
            attributes = merge({
                'id': objId,
                'name': objId, // Both ID and Name needed or swf to identify itself
                'class': 'vjs-tech'
            }, options.attributes)
      ;

        // If source was supplied pass as a flash var.
        if (source) {
            this.ready(function(){
            this.setSource(source);
              });
        }

        // Add placeholder to player div
        insertFirst(placeHolder, parentEl);

        // Having issues with Flash reloading on certain page actions (hide/resize/fullscreen) in certain browsers
        // This allows resetting the playhead when we catch the reload
        if (options.startTime) {
        this.ready(function(){
          this.load();
          this.play();
          this.currentTime(options.startTime);
            });
        }

      // firefox doesn't bubble mousemove events to parent. videojs/video-js-swf#37
      // bugzilla bug: https://bugzilla.mozilla.org/show_bug.cgi?id=836786
      if (vjs.IS_FIREFOX) {
        this.ready(function(){
          this.on('mousemove', function(){
            // since it's a custom event, don't bubble higher than the player
            this.player().trigger({ 'type':'mousemove', 'bubbles': false });
          });
        });
      }

      // native click events on the SWF aren't triggered on IE11, Win8.1RT
      // use stageclick events triggered from inside the SWF instead
      player.on('stageclick', player.reportUserActivity);
      vjs.Vpaidflash.prototype.src.call(this, options.source && options.source.src);
        this.el_ = vjs.Vpaidflash.embed.call(this, options.swf, placeHolder, flashVars, params, attributes);
        
    }
  });

  // Add HLS to the standard tech order
  vjs.options.techOrder.unshift('vpaidflash');

  vjs.Vpaidflash.prototype.dispose = function(){
      vjs.MediaTechController.prototype.dispose.call(this);
  };

  vjs.Vpaidflash.prototype.pause = function(){
    this.el_.vjs_pause();
  };

  vjs.Vpaidflash.prototype.setSrc = function(src){

    // Patch taken from https://github.com/guardian/video.js/blob/master/src/js/media/vpaid.js#L115
    // A dependency on the vast plugin. Retrieve the source object for the requested src,
    // and pass properties into the player.
    if (this.player_.vast && this.player_.vast.sources) {

      var sources = this.player_.vast.sources();

      var sourceObject;

      vjs.arr.forEach(sources, function(srcObj) {
        if (srcObj.src === src) {
          sourceObject = srcObj;
        }
      }, this);

      if (sourceObject) {
        this.el_.vjs_setProperty('adParameters', sourceObject.adParameters);
        this.el_.vjs_setProperty('duration', sourceObject.duration);
        this.el_.vjs_setProperty('bitrate', sourceObject.bitrate);
        this.el_.vjs_setProperty('width', sourceObject.width);
        this.el_.vjs_setProperty('height', sourceObject.height);

        this.player_.duration(sourceObject.duration);
        this.trackCurrentTime();
      }
    }

    // Make sure source URL is absolute.
    src = vjs.getAbsoluteURL(src);
    this.el_.vjs_src(src);

    // Currently the SWF doesn't autoplay if you load a source later.
    // e.g. Load player w/ no source, wait 2s, set src.
    if (this.player_.autoplay()) {
      var tech = this;
      this.setTimeout(function(){ tech.play(); }, 0);
    }
  };

  vjs.Vpaidflash.prototype.setCurrentTime = function(time){
    this.lastSeekTarget_ = time;
    this.el_.vjs_setProperty('currentTime', time);
    vjs.MediaTechController.prototype.setCurrentTime.call(this);
  };

  vjs.Vpaidflash.prototype.currentTime = function (time) {
    // when seeking make the reported time keep up with the requested time
    // by reading the time we're seeking to
    if (this.seeking()) {
      return this.lastSeekTarget_ || 0;
    }
    return this.el_.vjs_getProperty('currentTime');
  };

  vjs.Vpaidflash.prototype.currentSrc = function(){
    if (this.currentSource_) {
      return this.currentSource_.src;
    } else {
      return this.el_.vjs_getProperty('currentSrc');
    }
  };

  vjs.Vpaidflash.prototype.load = function(){
    this.el_.vjs_load();
  };

  vjs.Vpaidflash.prototype.poster = function(){
    this.el_.vjs_getProperty('poster');
  };

  vjs.Vpaidflash.prototype.play = function(){
    // TuanLDT edit -S
    // add try catch
    var player = this.player();
    var src = player.currentSrc();

     var swfObject = player.el_.firstChild;
     swfObject.mbp_initVPAID(src);
  };

  vjs.Vpaidflash.prototype.setPoster = function(){
    // poster images are not handled by the Flash tech so make this a no-op
  };

  vjs.Vpaidflash.prototype.buffered = function(){
    return vjs.createTimeRange(0, this.el_.vjs_getProperty('buffered'));
  };

  vjs.Vpaidflash.prototype.supportsFullScreen = function(){
    return false; // Flash does not allow fullscreen through javascript
  };

  vjs.Vpaidflash.prototype.enterFullScreen = function(){
    return false;
  };

  (function () {
    // Create setters and getters for attributes
    var api = vjs.Vpaidflash.prototype,
      readWrite = 'preload,defaultPlaybackRate,playbackRate,autoplay,loop,mediaGroup,controller,controls,volume,muted,defaultMuted'.split(','),
      readOnly = 'error,networkState,networkState,seeking,initialTime,duration,startOffsetTime,paused,played,seekable,ended,videoTracks,audioTracks,videoWidth,videoHeight'.split(','),
      // Overridden: buffered, currentTime, currentSrc
      i;

    function createSetter(attr){
      var attrUpper = attr.charAt(0).toUpperCase() + attr.slice(1);
      api['set'+attrUpper] = function(val){ return this.el_.vjs_setProperty(attr, val); };
    }
    function createGetter(attr) {
      api[attr] = function(){ return this.el_.vjs_getProperty(attr); };
    }

    // Create getter and setters for all read/write attributes
    for (i = 0; i < readWrite.length; i++) {
      createGetter(readWrite[i]);
      createSetter(readWrite[i]);
    }

    // Create getters for read-only attributes
    for (i = 0; i < readOnly.length; i++) {
      createGetter(readOnly[i]);
    }
  })();

  /* Flash Support Testing -------------------------------------------------------- */

  vjs.Vpaidflash.isSupported = function(){
    return vjs.Flash.isSupported();
    // return swfobject.hasFlashPlayerVersion('10');
  };

  /*vjs.Vpaidflash.canPlaySource = function(srcObj) {
    console.log(srcObj);
    return false;
  };*/

  // Add Source Handler pattern functions to this tech
  vjs.MediaTechController.withSourceHandlers(vjs.Vpaidflash);

  /**
   * The default native source handler.
   * This simply passes the source to the video element. Nothing fancy.
   * @param  {Object} source   The source object
   * @param  {vjs.Vpaidflash} tech  The instance of the Flash tech
   */
  vjs.Vpaidflash.nativeSourceHandler = {};

  /**
   * Check Flash can handle the source natively
   * @param  {Object} source  The source object
   * @return {String}         'probably', 'maybe', or '' (empty string)
   */
  
  vjs.Vpaidflash.canPlaySource = function(source){
    var type;

    if (!source.type) {
      return '';
    }

    var formats = {
      'application/x-shockwave-flash': 'swf'
    }

    // Strip code information from the type because we don't get that specific
    type = source.type.replace(/;.*/,'').toLowerCase();

    if (type in formats) {
      return 'maybe';
    }

    return '';
  };

  vjs.Vpaidflash.nativeSourceHandler.canPlaySource = function(srcObj) {
    console.log(srcObj);
    return false;
  };

  /**
   * Pass the source to the flash object
   * Adaptive source handlers will have more complicated workflows before passing
   * video data to the video element
   * @param  {Object} source    The source object
   * @param  {vjs.Vpaidflash} tech   The instance of the Flash tech
   */
  vjs.Vpaidflash.prototype.src = function(src){
    var tech = this;
    this.player().ready(function() {
      // do nothing if the tech has been disposed already
      // this can occur if someone sets the src in player.ready(), for instance
      if (!tech.el()) {
        return;
      }
      tech.setSrc(src);
    });
  };

  /**
   * Clean up the source handler when disposing the player or switching sources..
   * (no cleanup is needed when supporting the format natively)
   */
  vjs.Vpaidflash.nativeSourceHandler.dispose = function(){};

  // Register the native source handler
  //vjs.Vpaidflash.registerSourceHandler(vjs.Vpaidflash.nativeSourceHandler);

  vjs.Vpaidflash.onReady = function(currSwf){
    var el, player;

    el = vjs.el(currSwf);

    // get player from the player div property
    player = el && el.parentNode && el.parentNode.player;

    // if there is no el or player then the tech has been disposed
    // and the tech element was removed from the player div
    if (player) {
      // reference player on tech element
      el.player = player;
      // check that the flash object is really ready
      vjs.Vpaidflash.checkReady(player.tech);
    }
  };

  // The SWF isn't always ready when it says it is. Sometimes the API functions still need to be added to the object.
  // If it's not ready, we set a timeout to check again shortly.
  vjs.Vpaidflash.checkReady = function(tech){
    // stop worrying if the tech has been disposed
    if (!tech.el()) {
      return;
    }
    
    var player = tech.player();
    var currentSrc = player.currentSrc();
    // check if API property exists
    if (tech.el().vjs_getProperty) {
      // tell tech it's ready
      tech.setSrc(currentSrc);
      tech.triggerReady();
    } else {
      // wait longer
      this.setTimeout(function(){
        vjs.Vpaidflash.checkReady(tech);
      }, 50);
    }
  };

  // Trigger events from the swf on the player
  vjs.Vpaidflash.onEvent = function(swfID, eventName){
    console.log('ON EVENT', swfID, eventName);
    var player = vjs.el(swfID).player;
    
    console.log(eventName);
    if (eventName === 'ended') {
      console.log('disposing');
      //player.el_.removeChild(player.el_.firstChild);
      //player.src({ type: "video/mp4", src: "http://www.example.com/path/to/video.mp4" });
      
      //player.play();
    }
    //player.play();
    player.trigger(eventName);
  };

  // Log errors from the swf
  vjs.Vpaidflash.onError = function(swfID, err){
    console.log('ON ERROR', swfID, err);
    var player = vjs.el(swfID).player;
    var msg = 'FLASH: '+err;

    if (err === 'srcnotfound') {
      player.error({ code: 4, message: msg });

    // errors we haven't categorized into the media errors
    } else {
      player.error(msg);
    }
  };

  // Flash Version Check
  vjs.Vpaidflash.version = function(){
    var version = '0,0,0';

    // IE
    try {
      version = new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version').replace(/\D+/g, ',').match(/^,?(.+),?$/)[1];

    // other browsers
    } catch(e) {
      try {
        if (navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin){
          version = (navigator.plugins['Shockwave Flash 2.0'] || navigator.plugins['Shockwave Flash']).description.replace(/\D+/g, ',').match(/^,?(.+),?$/)[1];
        }
      } catch(err) {}
    }
    return version.split(',');
  };

  // Flash embedding method. Only used in non-iframe mode
  vjs.Vpaidflash.embed = function(swf, placeHolder, flashVars, params, attributes){
    console.log('EMBED TIME!');
    var code = vjs.Vpaidflash.getEmbedCode(swf, flashVars, params, attributes),

        // Get element by embedding code and retrieving created element
        obj = vjs.Component.prototype.createEl('div', { innerHTML: code }).childNodes[0],

        par = placeHolder.parentNode,

        player = this.player();
    ;
    
    console.log('code:', code);

    placeHolder.parentNode.replaceChild(obj, placeHolder);

    // IE6 seems to have an issue where it won't initialize the swf object after injecting it.
    // This is a dumb fix
    var newObj = par.childNodes[0];
    setTimeout(function(){
    console.log('new object should be ready');
    newObj.style.display = 'block';
    player.play();
    }, 3000);


    return obj;

  };

  vjs.Vpaidflash.getEmbedCode = function(swf, flashVars, params, attributes){

    console.log('get embed code');
    console.log('swf', swf, '\nflashVars', flashVars, '\nparams', params, '\nattributes', attributes);
    var objTag = '<object type="application/x-shockwave-flash" ',
        flashVarsString = '',
        paramsString = '',
        attrsString = '';

    // Convert flash vars to string
    if (flashVars) {
      each(flashVars, function(key, val){
        flashVarsString += (key + '=' + val + '&amp;');
      });
    }

    // Add swf, flashVars, and other default params
    params = merge({
      'movie': swf,
      'flashvars': flashVarsString,
      'allowScriptAccess': 'always', // Required to talk to swf
      'allowNetworking': 'all' // All should be default, but having security issues.
    }, params);

    // Create param tags string
    each(params, function(key, val){
      paramsString += '<param name="'+key+'" value="'+val+'" />';
    });

    attributes = merge({
      // Add swf to attributes (need both for IE and Others to work)
      'data': swf,

      // Default to 100% width/height
      'width': '100%',
      'height': '100%'

    }, attributes);

    // Create Attributes string
    each(attributes, function(key, val){
      attrsString += (key + '="' + val + '" ');
    });

    return objTag + attrsString + '>' + paramsString + '</object>';
  };
})(window, window.videojs);