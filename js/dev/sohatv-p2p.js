(function(window, videojs, document, undefined) {
'use strict';

var
  // a fudge factor to apply to advertised playlist bitrates to account for
  // temporary flucations in client bandwidth
  bandwidthVariance = 1.1;

videojs.P2p = videojs.Hls.extend({
  init: function(player, options, ready) {
    var
          source = options.source,
          settings = player.options();

        player.p2p = this;
        delete options.source;
        options.swf = settings.flash.swf;
        videojs.Flash.call(this, player, options, ready);
        options.source = source;
        this.bytesReceived = 0;
        this.p2phls = new P2PHLS(options.source);

        // TODO: After video.js#1347 is pulled in remove these lines
        this.currentTime = videojs.P2p.prototype.currentTime;
        this.setCurrentTime = videojs.P2p.prototype.setCurrentTime;

        videojs.P2p.prototype.src.call(this, options.source && options.source.src);
  }
});

// Add HLS to the standard tech order
videojs.options.techOrder.unshift('p2p');

videojs.P2p.prototype.cancelSegmentXhr = function() {
  var i = 0;
  // Prevent error handler from running.
  if(this.segmentXhrs_) {
    var keys = _.keys(this.segmentXhrs_);
    for (i = 0; i < keys.length; i++ ) {
      this.segmentXhrs_[keys[i]].onreadystatechange = null;
      this.segmentXhrs_[keys[i]].abort();
      delete this.segmentXhrs_[keys[i]];
    }
    this.segmentXhrs_ = null;
  }
};

videojs.P2p.prototype.fillBuffer = function(offset) {
  var
    player = this.player(),
    buffered = player.buffered(),
    bufferedTime = 0,
    segment,
    segmentUri;

  this.segmentXhrs_ = this.segmentXhrs_ || {};

  // if there is a request already in flight, do nothing
  if (_.size(this.segmentXhrs_) > 0 || this.segmentBuffer_.length > 0) {
    return;
  }
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

  if (buffered) {
    // assuming a single, contiguous buffer region
    bufferedTime = player.buffered().end(0) - player.currentTime();
  }

  // if there is plenty of content in the buffer and we're not
  // seeking, relax for awhile
  if (typeof offset !== 'number' && bufferedTime >= videojs.Hls.GOAL_BUFFER_LENGTH) {
    return;
  }

  //var segments = this.checkSegments();
  var numberResquest = 2;
  for (var i = 0; i < numberResquest; i++) {
    var seg = this.playlists.media().segments[this.mediaIndex + i];
    if (!seg) {
      continue;
    }
    var segUri = this.playlistUriToUrl(seg.uri);
    var segIndex = this.mediaIndex + i;
    this.loadSegment1(segUri, offset, segIndex);
  }

  // resolve the segment URL relative to the playlist
  //segmentUri = this.playlistUriToUrl(segment.uri);

  //this.loadSegment(segmentUri, offset);
};

videojs.P2p.prototype.checkSegments = function() {
  var tech = this;
  var player= this.player();
  var buffered = player.buffered();
  var bufferedTime = 0;

  var segments = [];
  var bufferLength;

 var keys_SegmentXhrs_ = _.keys(tech.segmentXhrs_);
 for (var i = 0; i < keys_SegmentXhrs_.length; i++) {
    keys_SegmentXhrs_[i] = parseInt(keys_SegmentXhrs_[i]);
 }
 /*var index_segBuffer = _.map(tech.segmentBuffer_, function(ele) {
  return ele.mediaIndex;
 });*/
//var index_segBuffer = [-1];
  //var wait_segments =  keys_SegmentXhrs_.concat(index_segBuffer);
  var wait_segments = keys_SegmentXhrs_;
  var max_segments = _.max(wait_segments);
  if (!isFinite(max_segments)) {
    return [(this.mediaIndex || -1) + 1, (this.mediaIndex || -1) + 2];
  }
  var seg = this.playlists.media().segments[max_segments];
   //var max = _.max(keys_SegmentXhrs_, index_segBuffer);
  if (buffered) {
    // assuming a single, contiguous buffer region
    bufferedTime = player.buffered().end(0) - player.currentTime() + wait_segments.length*seg.duration;
  }

  if(bufferedTime > videojs.Hls.GOAL_BUFFER_LENGTH) {
    return;
  }

  return [max_segments + 1,max_segments + 2];

}

videojs.P2p.prototype.loadSegment = function(segmentUri, offset) {
  var
    tech = this,
    player = this.player(),
    settings = player.options().hls || {};
  
  console.info('Load Segment:' + segmentUri);
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

videojs.P2p.prototype.loadSegment1 = function(segmentUri, offset, segIndex) {
  var i = 0,
    tech = this,
    player = this.player(),
    settings = player.options().hls || {};
  console.info('Load Segment:' + segmentUri);
  // request the next segment
  var segmentXhr_ = videojs.Hls.xhr({
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
        return tech.playlists.media(tech.selectPlaylist());
      }
      // otherwise, try jumping ahead to the next segment
      tech.error = {
        status: this.status,
        message: 'HLS segment request error at URL: ' + url,
        code: (this.status >= 500) ? 4 : 2
      };

      // try moving on to the next segment
      tech.mediaIndex++;
      return;
    }

    // stop processing if the request was aborted
    if (!this.response) {
      return;
    }

    tech.setBandwidth(this);

    // package up all the work to append the segment
    // if the segment is the start of a timestamp discontinuity,
    // we have to wait until the sourcebuffer is empty before
    // aborting the source buffer processing
    
    tech.segmentBuffer_[segIndex - tech.mediaIndex] = {
                                                        mediaIndex: segIndex,
                                                        playlist: tech.playlists.media(),
                                                        offset: offset,
                                                        bytes: new Uint8Array(this.response)
                                                      }
    if (!tech.segmentBuffer_[0]) {
      return;
    }
    var segment_length = tech.segmentBuffer_.length;
    for (i = 0; i < segment_length; i++) {
      //if (tech.segmentBuffer_[i].mediaIndex >  tech.mediaIndex) break;
      tech.mediaIndex++;
      tech.drainBuffer();
      
      tech.playlists.media(tech.selectPlaylist());
    }
    
    // figure out what stream the next segment should be downloaded from
    // with the updated bandwidth information
    
  });
  this.segmentXhrs_[segIndex] = segmentXhr_;
}

videojs.Hls.prototype.selectPlaylist = function () {
  var
    player = this.player(),
    effectiveBitrate,
    sortedPlaylists = this.playlists.master.playlists.slice(),
    bandwidthPlaylists = [],
    i = sortedPlaylists.length,
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

    if (effectiveBitrate < player.p2p.bandwidth) {
      bandwidthPlaylists.push(variant);

      // since the playlists are sorted in ascending order by
      // bandwidth, the first viable variant is the best
      if (!bandwidthBestVariant) {
        bandwidthBestVariant = variant;
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
      break;
    }
  }

  // fallback chain of variants
  return resolutionBestVariant || bandwidthBestVariant || sortedPlaylists[0];
};

videojs.P2p.isSupported = function() {

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

videojs.P2p.canPlaySource = function(srcObj) {
  var mpegurlRE = /^application\/(?:x-|vnd\.apple\.)mpegurl/i;
  return mpegurlRE.test(srcObj.type);
};

})(window, window.videojs, document);