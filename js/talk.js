/**
 * talk.js -- JavaScript Speech Recognition Engine
 *
 * Port of PocketSphinx 0.7 light-weight speech recognition engine
 * to JavaScript, using Emscripten.
 *
 * @author: Mihai Cirlanaru (Mozilla 2012)
 */

// Text-to-digit mapping array
var digits = {
  "zero": 0, "oh": 0,
  "one": 1, "two": 2, "three": 3,
  "four": 4, "five": 5, "six": 6,
  "seven": 7, "eight": 8, "nine": 9
};

/**
 * Speech recognition result structure
 * @param {String} hyp best found decoding, known as hypothesis
 * @param {Array} nbest array containing the N-best hypotheses
 * @param {Object} timer object containing the performance timer data (rec length, CPU and decoding time)
 */
function TalkResult(hyp, nbest, timer){
  this.hypothesis = hyp;
  this.nbest = nbest || [];
  this.timer = { duration: timer.recLength || 0.0,
                 cpu: timer.cpu || 0.0,
                 rt: timer.rt || 0.0};
  /* Output timer information in oneliner String format */
  this.timer.toString = function() {
    return "Speech: "+timer.recLength+"s CPU: "+timer.cpu+"s Decoding: "+timer.rt+" x RT";
  };
  /* Convert all digits */
  this.convertDigits = function() {
    var words = this.hypothesis.split(" ");
    for (var i = words.length - 1; i >= 0; i--) {
      var tr = digits[words[i].toLowerCase()];
      words[i] = (typeof tr != "undefined")? tr: words[i];
    };
    return words.join(" ");
  }
}

 /**
  * Interface for decoding a wav/raw audio file using the config
  * @param {String} audioFile URL to or byte array of a wav/raw audio file
  * @param {Object} config configuration regarding language/acoustic model locations
  * @param {callback} onResult callback for getting a TalkResult decoding result obj
  * @param {Boolean} isURL variable for specifying if the audioFile is a URL
  */
function recognizeSpeech(audioFile, config, onResult, isURL) {
  if ( !(config.hasOwnProperty('hmmDir') && (config.hasOwnProperty('dmp') || config.hasOwnProperty('fsg'))
      && config.hasOwnProperty('dic')) ) {
    console.log("ERROR: config misses attributes (hmmDir, dmp, or dic)");
    alert("ERROR: Wrong acoustic/language models configuration for decoder!");
    return -1;
  }

  var hyp;
  // Populate acoustic/language models parameters
  Module = {
    raw: audioFile,
    mdef: config.hmmDir + "/mdef",
    tmat: config.hmmDir + "/transition_matrices",
    variances: config.hmmDir + "/variances",
    sendump: config.hmmDir + "/sendump",
    fparams: config.hmmDir + "/feat.params",
    mean: config.hmmDir + "/means",
    DMP: config.dmp,
    fsg: config.fsg,
    dic: config.dic,
    samprate: config.sampleRate ? config.sampleRate : "16000",
    nbest: config.nbest ? config.nbest : "0"
  };
  // Check if decoding a URL
  if (typeof isURL != "undefined" && isURL) {
    Module["audio_url"] = audioFile;
  }
  // Initialize worker for speech decoding
  var WORKER_PATH = config.workerPath || "js/talkWorker.min.js"; // default worker path
  var worker = new Worker(WORKER_PATH);
  console.log("INFO: Using web worker from " + WORKER_PATH);

  worker.onmessage = function(e) {
    if (e.data.error) {
      document.getElementById("srec_hyp").innerHTML=e.data.error; 
      onResult(e.data.error);
    } else {
      if(e.data.debug) {
        console.log(e.data.debug);
      }
      if(e.data.timer) {
        onResult(new TalkResult(hyp, e.data.nbest, e.data.timer));
      }
      if (e.data.hypothesis) {
        hyp = e.data.hypothesis;
      }
    } //end if error
  };

  worker.postMessage({command: "decodeSpeech", config: {module: Module, debug: false} });
}