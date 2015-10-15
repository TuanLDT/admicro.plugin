(function(window, videojs, document, undefined) {
'use strict';

var
  // a fudge factor to apply to advertised playlist bitrates to account for
  // temporary flucations in client bandwidth
  bandwidthVariance = 1.1;

videojs.HlSoha = videojs.Hls.extend({
  init: function(player, options, ready) {
    var
          source = options.source,
          settings = player.options();

        player.hlSoha = this;
        delete options.source;
        options.swf = settings.flash.swf || 'http://s.vcplayer.vcmedia.vn/skin/VCPlayer.swf';
        videojs.Hls.call(this, player, options, ready);
        options.source = source;
        this.bytesReceived = 0;
        
        this.p2pInit();
        //this.p2phls = new P2PHLS(options.source);

        // TODO: After video.js#1347 is pulled in remove these lines
        this.currentTime = videojs.HlSoha.prototype.currentTime;
        this.setCurrentTime = videojs.HlSoha.prototype.setCurrentTime;

        // handle event
        player.on('segLoadError', videojs.bind(this, this.segLoadErrorHandler));
        player.on('loaderError', videojs.bind(this, this.manifestErrorHandler));
        videojs.HlSoha.prototype.src.call(this, options.source && options.source.src);
  }
});

// Add HLS to the standard tech order
videojs.options.techOrder.unshift('hlSoha');

videojs.HlSoha.prototype.dispose = function() {
  var player = this.player();

  // remove event handlers
  player.off('segLoadError', this.segLoadErrorHandler);
  player.off('loaderError', this.manifestErrorHandler);
  videojs.Hls.prototype.dispose.call(this);
}

videojs.HlSoha.prototype.cancelSegmentXhr = function() {
  var i = 0;
  // Prevent error handler from running.
  if(this.segmentXhrs_) {
    var keys = _.keys(this.segmentXhrs_);
    for (i = 0; i < keys.length; i++ ) {
      if(this.segmentXhrs_[keys[i]].constructor.name  == "XMLHttpRequest") {
        this.segmentXhrs_[keys[i]].onreadystatechange = null;
        this.segmentXhrs_[keys[i]].abort();
      }
      delete this.segmentXhrs_[keys[i]];
    }
    this.segmentXhrs_ = null;
  }
  //this.p2pReset();
  this.firstSegment = false;
};

videojs.HlSoha.prototype.setCurrentTime = function(currentTime) {
  videojs.Hls.prototype.setCurrentTime.call(this,currentTime);
  this.p2pReset();
}

videojs.HlSoha.prototype.fillBuffer = function(offset) {
  var
    tech = this,
    player = this.player(),
    buffered = player.buffered(),
    bufferedTime = 0,
    segment,
    segmentUri;

  this.segmentXhrs_ = this.segmentXhrs_ || {};

  // if there is a request already in flight, do nothing
  /*if (_.size(this.segmentXhrs_) > 0 || this.segmentBuffer_.length > 0) {
    return;
  }*/
  // if no segments are available, do nothing
  if (this.playlists.state === "HAVE_NOTHING" ||
      !this.playlists.media().segments) {
    return;
  }

  // if the video has finished downloading, stop trying to buffer
  segment = this.playlists.media().segments[this.mediaIndex];
  if (!segment) {
    return;
  }

  /*if (buffered) {
    // assuming a single, contiguous buffer region
    bufferedTime = player.buffered().end(0) - player.currentTime();
  }*/

  // if there is plenty of content in the buffer and we're not
  // seeking, relax for awhile
  if (typeof offset !== 'number' && bufferedTime >= videojs.Hls.GOAL_BUFFER_LENGTH) {
    return;
  }

  var segments = this.fillSegments(offset);
  for (var i = 0; i < segments.length; i++) {
    var seg = this.playlists.media().segments[segments[i]];
    if (!seg) {
      delete tech.segmentXhrs_[segments[i]];
      continue;
    }
    var segUri = this.playlistUriToUrl(seg.uri);
    this.loadSegment1(segUri, offset, segments[i]);
  }

  // resolve the segment URL relative to the playlist
  //segmentUri = this.playlistUriToUrl(segment.uri);

  //this.loadSegment(segmentUri, offset);
};

videojs.HlSoha.prototype.fillSegments = function(offset) {

  var tech = this;
  var player= this.player();
  var buffered = player.buffered();
  var bufferedTime = 0;
  var playBuffer = 0;
  var segmentsBuffer = [];
  var heightBuffer = false;
  var type = this.type =  !this.playlists.media().endList ? 0 : 1;
  if (buffered) {
    // assuming a single, contiguous buffer region
    playBuffer = bufferedTime = player.buffered().end(0) - player.currentTime();
    // Set điều kiện buffer quá thấp. Nếu quá thấp chỉ load 1 file 1
    heightBuffer = bufferedTime >= 3 ? true : false;
  }

  //  Mảng chỉ số các Segment đang request
  var keys_SegmentXhrs_ = _.keys(tech.segmentXhrs_);
  //console.log("Number Segment requesting: " + keys_SegmentXhrs_.length);
  if (keys_SegmentXhrs_.length >= 3) {
    return [];
  }
  for (var i = 0; i < keys_SegmentXhrs_.length; i++) {
    keys_SegmentXhrs_[i] = parseInt(keys_SegmentXhrs_[i]);
  }

  // Mảng chỉ số các Segment đã request xong
  for (var i = 0; i <  tech.segmentBuffer_.length; i++ ) {
    if (!tech.segmentBuffer_[i]) continue;
    segmentsBuffer.push(tech.segmentBuffer_[i].mediaIndex);
  }

  //console.log("Number Segment in Buffer: " + segmentsBuffer.length);

  // Mảng chỉ số các Segment đang request và đã request xong(chưa đẩy vào buffer để play)
  var wait_segments =  keys_SegmentXhrs_.concat(segmentsBuffer);

  // Tính playBuffer bao gồm cả duration của các segment đang request và đã request xong
  for (var i = 0; i <  wait_segments.length; i++ ) {
    var seg = this.playlists.media().segments[wait_segments[i]];
    if(!seg) continue;
    playBuffer += seg.duration;
  }
  
  if(typeof offset !== 'number' && playBuffer > videojs.Hls.GOAL_BUFFER_LENGTH && this.firstSegment/*&& (this.currentLevel != (this.playlists.master.playlists.length -1) || playBuffer > 50)*/) {
    return [];
  }
  var max_segments = _.max(wait_segments);

  var index = Math.max(this.mediaIndex, max_segments + 1, 0);
  // Chưa request segment nào => request segment 0
  if (index == 0) return [0];
  var val_Retry = !this.isRetrySegment;
  var isDelayLevel =  this.delayLevel == 0 ? 1 : 0;
  var segmentsPerLevel
  try {
    segmentsPerLevel = Math.max(1,Math.floor(tech.bandwidth/this.playlists.media().attributes.BANDWIDTH));
  } catch (e) {
    segmentsPerLevel = 1;
  }
  var numberSegment = Math.min(segmentsPerLevel, (0.5*this.currentLevel*type*this.firstSegment*heightBuffer*isDelayLevel*val_Retry + 1)) - keys_SegmentXhrs_.length;
 
  var requestSegments = [];
  for (var i = 0; i < numberSegment; i++) {
    tech.segmentXhrs_[index + i] = {};
    requestSegments.push(index + i);
  }
  return requestSegments;

}

videojs.HlSoha.prototype.loadSegment = function(segmentUri, offset) {
  var
    tech = this,
    player = this.player(),
    settings = player.options().hls || {};
  
  tech.p2phls.requestResource(segmentUri, function(error, url) {
    tech.setBandwidth(this);

    // package up all the work to append the segment
    // if the segment is the start of a timestamp discontinuity,
    // we have to wait until the sourcebuffer is empty before
    // aborting the source buffer processing
    tech.segmentBuffer_.push({
      mediaIndex: tech.mediaIndex,
      playlist: tech.playlists.media(),
      offset: offset,
      bytes: new Uint8Array(this.response)
    });
    tech.drainBuffer();

    tech.mediaIndex++;

    // figure out what stream the next segment should be downloaded from
    // with the updated bandwidth information
    tech.playlists.media(tech.selectPlaylist());
    this.onDecodeSuccess();
  });
}

videojs.HlSoha.prototype.loadSegment1 = function(segmentUri, offset, segIndex) {
  var i = 0,
    tech = this,
    player = this.player(),
    settings = player.options().hls || {};
  // request the next segment
  var segmentXhr_;
  this.segmentXhrs_[segIndex] =  segmentXhr_ = videojs.Hls.xhr({
    url: segmentUri,
    responseType: 'arraybuffer',
    withCredentials: settings.withCredentials
  }, function(error, url) {
    // the segment request is no longer outstanding
    //tech.segmentXhrs_[segIndex] = null;
    delete tech.segmentXhrs_[segIndex];
    if (error) {
      // if a segment request times out, we may have better luck with another playlist
      if (error === 'timeout') {
        tech.bandwidth = 1;
        tech.cancelSegmentXhr;
        tech.segmentBuffer_ = [];
        return tech.playlists.media(tech.selectPlaylist());
      }
      // otherwise, try jumping ahead to the next segment
      tech.error = {
        status: this.status,
        segIndex: segIndex,
        message: 'HLS segment request error at URL: ' + url,
        code: (this.status >= 500) ? 4 : 2
      };

      player.trigger('segLoadError', tech.error);

      // try moving on to the next segment
      //tech.mediaIndex++;
      return;
    }

    // stop processing if the request was aborted
    if (!this.response) {
      return;
    }

    tech.setBandwidth(this);
    
    tech.firstSegment = true;
    tech.isRetrySegment = false;
    tech.segSquenceError = 0;
    // package up all the work to append the segment
    // if the segment is the start of a timestamp discontinuity,
    // we have to wait until the sourcebuffer is empty before
    // aborting the source buffer processing
    //console.log("segIndex/mediaIndex: " + segIndex + "/" +tech.mediaIndex);
    tech.segmentBuffer_[(segIndex - tech.mediaIndex)*tech.type] = {
                                                        mediaIndex: segIndex,
                                                        playlist: tech.playlists.media(),
                                                        offset: offset,
                                                        bytes: new Uint8Array(this.response)
                                                      }

    while (tech.segmentBuffer_[0]) {
      tech.mediaIndex++;
      tech.drainBuffer();
      
      tech.playlists.media(tech.selectPlaylist());
    }
    
    // figure out what stream the next segment should be downloaded from
    // with the updated bandwidth information
    
  });
  
}

videojs.HlSoha.prototype.selectPlaylist = function () {
  var
    player = this.player(),
    effectiveBitrate,
    sortedPlaylists = this.playlists.master.playlists.slice(),
    bandwidthPlaylists = [],
    i = sortedPlaylists.length,
    j,
    k,
    variant,
    bandwidthBestVariant,
    resolutionBestVariant;

  sortedPlaylists.sort(videojs.Hls.comparePlaylistBandwidth);

  // filter out any variant that has greater effective bitrate
  // than the current estimated bandwidth
  while (i--) {
    variant = sortedPlaylists[i];

    // ignore playlists without bandwidth information
    if (!variant.attributes || !variant.attributes.BANDWIDTH) {
      continue;
    }

    effectiveBitrate = variant.attributes.BANDWIDTH * bandwidthVariance;

    if (effectiveBitrate < player.hlSoha.bandwidth) {
      bandwidthPlaylists.push(variant);

      // since the playlists are sorted in ascending order by
      // bandwidth, the first viable variant is the best
      if (!bandwidthBestVariant) {
        bandwidthBestVariant = variant;
        j = i;
      }
    }
  }

  i = bandwidthPlaylists.length;

  // sort variants by resolution
  bandwidthPlaylists.sort(videojs.Hls.comparePlaylistResolution);

  // iterate through the bandwidth-filtered playlists and find
  // best rendition by player dimension
  while (i--) {
    variant = bandwidthPlaylists[i];

    // ignore playlists without resolution information
    if (!variant.attributes ||
        !variant.attributes.RESOLUTION ||
        !variant.attributes.RESOLUTION.width ||
        !variant.attributes.RESOLUTION.height) {
      continue;
    }

    // since the playlists are sorted, the first variant that has
    // dimensions less than or equal to the player size is the
    // best
    if (variant.attributes.RESOLUTION.width <= player.width() &&
        variant.attributes.RESOLUTION.height <= player.height()) {
      resolutionBestVariant = variant;
      j = i;
      break;
    }
  }

  j = j || 0;
  if (typeof this.currentLevel == "undefined" || this.currentLevel >= j) {
    this.currentLevel = j;
    this.delayLevel = 0;
  } else {
    if (this.currentLevel < j &&  this.delayLevel < 1) {
      this.delayLevel ++;
      return this.playlists.media();
    }
    this.currentLevel = j;
    this.delayLevel = 0;
  }
  // fallback chain of variants
  return resolutionBestVariant || bandwidthBestVariant || sortedPlaylists[0];
};

videojs.HlSoha.prototype.typeToString = function() {
  switch(this.type) {
    case 0: {
      return "LIVE";
    }
    case 1: {
      return "VOD";
    }
  }
};

videojs.HlSoha.prototype.changeLevelPlaylist = function() {
  var 
    tech = this,
    sortedPlaylists = this.playlists.master.playlists.slice();
    if (sortedPlaylists.length <= 1) {
      return;
    }

    if (tech.currentLevel == 0) {
      tech.currentLevel = 1;
      tech.playlists.media(sortedPlaylists[1]);
    } else {
      tech.currentLevel -= 1;
      tech.playlists.media(sortedPlaylists[tech.currentLevel]);
    }
}

videojs.HlSoha.prototype.segLoadErrorHandler = function(error) {
  if (typeof this.error.status != "undefined") {
    var i;
    var tech = this;
    var segmentError = tech.segmentLoadError;
    var keys = _.keys(tech.segmentXhrs_);

    switch(tech.error.status) {
      case 0: /*{
        //console.log("mất kết nối mạng");
        return;
      }*/
      case 403:
      case 404: 
      case 422: {
        tech.cancelSegmentXhr();
        tech.segmentBuffer_ = [];
        if (tech.segmentLoadError.segIndex !== tech.error.segIndex ) {

          if (tech.segSquenceError == 3) {
            //console.log("Mất mạng");
            return;
          }

          if (tech.error.segIndex - tech.segmentLoadError.segIndex == 1) {
            tech.segSquenceError =  tech.segSquenceError + 1 || 1;
          } else {
            tech.segSquenceError = 0;
          }
          tech.segmentLoadError.segIndex = tech.error.segIndex;
          tech.segmentLoadError.errorCount = 1;
        } else {
          tech.isRetrySegment = true;
          if (tech.segmentLoadError.errorCount < 1) {
            tech.segmentLoadError.errorCount ++;
          } else if (tech.segmentLoadError.errorCount == 1) {
            tech.segmentLoadError.errorCount ++;
            tech.bandwidth = 1;
            return tech.playlists.media(tech.selectPlaylist());
          } else {
            this.isRetrySegment = false;
            tech.mediaIndex++;
          }
        }
      }
      break;
    }
  };

  if (typeof this.error.code != "undefined") {
    switch(this.error.code) {
      case 4: {
        //console.log("Server không khả dụng");
      }
    }
  }
};

videojs.HlSoha.prototype.manifestErrorHandler = function() {
  //console.log(this.playlists.error);
}

videojs.HlSoha.prototype.p2pInit = function() {
  var tech = this;
  tech.firstSegment = false;
  tech.segmentLoadError = {};
  tech.isRetrySegment = false;
}

videojs.HlSoha.prototype.p2pReset = function() {
  var tech = this;
  tech.firstSegment = false;
  tech.segmentLoadError = {};
  tech.isRetrySegment = false;
}

videojs.HlSoha.isSupported = function() {
  
  // Only use the HLS tech if native HLS isn't available
  return !videojs.Hls.supportsNativeHls &&
    // Flash must be supported for the fallback to work
    videojs.Flash.isSupported() &&
    // Media sources must be available to stream bytes to Flash
    videojs.MediaSource &&
    // Typed arrays are used to repackage the segments
    window.Uint8Array &&
    // Support WebRTC
    !!(window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
};

videojs.HlSoha.canPlaySource = function(srcObj) {
  var mpegurlRE = /^application\/(?:x-|vnd\.apple\.)mpegurl/i;
  return mpegurlRE.test(srcObj.type);
};

})(window, window.videojs, document);