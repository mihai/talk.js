(function(window) {
  // Set path to recorder worker
  var WORKER_PATH = 'js/recorderWorker.js';

  var Recorder = function(source, cfg) {
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        fromSampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e) {
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg) {
      for (var prop in cfg) {
        if (cfg.hasOwnProperty(prop)) {
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function() {
      recording = true;
    }

    this.stop = function() {
      recording = false;
    }

    this.clear = function() {
      worker.postMessage({ command: 'clear' });
    }

    this.getWAV = function(cb, type, sampleRate) {
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'getWAV',
        type: type,
        toSampleRate: sampleRate
      });
    }

    this.getBuffer = function(cb) {
      currCallback = cb;
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({command: 'getBuffer'});
    }

    worker.onmessage = function(e) {
      var contextT = new webkitAudioContext();
      var blob = e.data;
      if (typeof blob == 'AudioBuffer') {
        contextT.decodeAudioData(e.data, function(buffer) {
          blob = buffer;
        });
      }
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination); // connect to speakers
  };

  Recorder.downloadWAV = function(blob, filename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'recording.wav';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
  }

  window.Recorder = Recorder;

})(window);
