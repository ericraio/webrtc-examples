// A Shiv for the diffent browser prefix getUserMedia
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = { video: true, audio: true }

function errorCallback(error) {
  console.log('Denied!!!!!!!!!', error);
};

function successCallback(localMediaStream) {
  var video = document.querySelector('video');
  video.src = window.URL.createObjectURL(localMediaStream); // Blob URL
};

navigator.getUserMedia(constraints, successCallback, errorCallback);
