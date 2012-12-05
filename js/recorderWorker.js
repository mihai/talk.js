var recLength = 0, recBuffers = [], fromSampleRate, channelCount = 1;
importScripts("resampler.js");

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'getWAV':
      getWAV(e.data.type, e.data.toSampleRate);
      break;
    case 'clear':
      clear();
      break;
    case 'getBuffer':
      getBuffer();
      break;
  }
};

function init(config){
  fromSampleRate = config.fromSampleRate;
  channelCount = config.channelCount;
}

function record(inputBuffer){
  var bufferL = inputBuffer[0];
  var bufferR = inputBuffer[1];
  var interleaved;
  // check if stereo or mono
  if (channelCount === 2) {
    interleaved = interleave(bufferL, bufferR);
  } else {
    interleaved = inputBuffer[0];
  }
  recBuffers.push(interleaved);
  recLength += interleaved.length;
}

function getWAV(type, toSampleRate){
  var buffer = mergeBuffers(recBuffers, recLength);
  // Resample --------------
  if (typeof toSampleRate != "undefined") {
    var bufferSize = Math.ceil(recLength * toSampleRate/fromSampleRate);
    var resamplerControl = new Resampler(fromSampleRate, toSampleRate, channelCount, bufferSize, true);
    var resampleLength = resamplerControl.resampler(buffer);
    var resampledBuffer = resamplerControl.outputBuffer;
    buffer = resampledBuffer;
  }
  // -----------------------
  var dataview = encodeWAV(buffer, toSampleRate);
  var audioBlob = new Blob([dataview], { type: type });

  this.postMessage(audioBlob);
}

function getBuffer(){
  var buffer = mergeBuffers(recBuffers,recLength);
  this.postMessage(buffer);
}

function clear(){
  recLength = 0;
  recBuffers = [];
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}

function interleave(inputL, inputR){
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0, inputIndex = 0;
  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }

  return result;
}

function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples, sampleRate){
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);
  if (typeof sampleRate === "undefined") {
    sampleRate = fromSampleRate;
  }
  // ------------------- WAV header ------------------
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 32 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 4, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, channelCount * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return view;
}
