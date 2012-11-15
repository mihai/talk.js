// talk.js -- JavaScript Speech Recognition Engine
//            Port of PocketSphinx 0.7 light-weight speech recognition engine 
//            to JavaScript, using Emscripten.
// Author: Mihai Cirlanaru (Mozilla 2012)

function recognizeSpeech(audioFile, config, isURL) {
  if ( !(config.hasOwnProperty('hmmDir') && (config.hasOwnProperty('dmp') || config.hasOwnProperty('fsg'))
      && config.hasOwnProperty('dic')) ) {

    console.log("ERROR: config misses attributes (hmmDir, dmp, or dic)");
    return -1;
  }

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

  if (typeof isURL != "undefined" && isURL) {
    Module["audio_url"] = audioFile;
  }

  var WORKER_PATH = "js/talkWorker.js"; // default worker path
  var worker = new Worker(config.workerPath || WORKER_PATH);

  worker.onmessage = function(e) {
    if (e.data.error) {
      document.getElementById("srec_hyp").innerHTML=e.data.error;  
    } else {
      if(e.data.debug) {
        console.log(e.data.debug);
      }
      // Get hypothesis
      if (e.data.hypothesis) {
        document.getElementById("srec_hyp").innerHTML=e.data.hypothesis;
      }
      // Get N-best hypotheses
      if (e.data.nbest) {
        for (var i = 0; i < e.data.nbest.length; i++) {
          document.getElementById("srec_hyp_nbest").innerHTML += e.data.nbest[i] + "<br/>";
        };
      }
      // Get timer output
      if (e.data.timer) {
      document.getElementById("srec_timer").innerHTML="TIME: "+ e.data.timer;
      }
    }
  };

  worker.postMessage({command: "decodeSpeech", config: {module: Module, debug: false} });

}