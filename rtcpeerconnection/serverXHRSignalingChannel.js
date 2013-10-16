var log = require("./log");

var connections = {};
var partner = {};
var messagesFor = {};

// send an error as the json WebRTC response
function webrtcError(err, res) {
  log("replying with webrtc error: " + err);
  webrtcResponse({ err: err }, res);
}

// queue the sending of a json response
function webrtcResponse(response, res) {
  log("replying with webrtc response " + JSON.stringify(response));
  res.writeHead(200, {"Content-Type": "application/json"});
  res.write(JSON.stringify(response));
  res.end();
}

// handle XML HTTP Request to connect using a given key
function connect(info) {
  var res = info.res;
  var query = info.query;
  var thisconnection;
  var newID = function() {
    // create large random number unlikely to be repeated
    // soon in server's lifetime
    return Math.floor(Math.random()*1000000000)
  };
  var connectFirstParty = function() {
    if (thisconnection.status == "connected") {
      // delete pairing and any stored messages
      delete partner[thisconnection.ids[0]];
      delete partner[thisconnection.ids[1]];
      delete messagesFor[thisconnection.ids[0]];
      delete messagesFor[thisconnection.ids[1]];
    }
    connections[query.key] = {};
    thisconnection = connections[query.key];
    thisconnection.status = "waiting";
    thisconnection.ids = [newID()];
    webrtcResponse({
      id: thisconnection.ids[0],
      status: thisconnection.status
    }, res);
  }
  var connectSecondParty = function() {
    thisconnection.ids[1] = newID();
    partner[thisconnection.ids[0]] = thisconnection.ids[1];
    partner[thisconnection.ids[1]] = thisconnection.ids[0];
    messagesFor[thisconnection.ids[0]] = [];
    messagesFor[thisconnection.ids[1]] = [];
    thisconnection.status = "connected";
    webrtcResponse({
      id: thisconnection.ids[1],
      status: thisconnection.status
    }, res);
  };

  log("Request handler 'connect' was called.");
  if (query && query.key) {
    var thisconnection = connections[query.key] || { status: "new" };
    if (thisconnection.status = "waiting") {
      connectSecondParty();
      return;
    } else {
      connectFirstParty();
      return;
    }
  } else {
    webrtcError("No recognizable query key", res);
  }
}
exports.connect = connect;

// Queues message in info.postData.message for sending to the
// partner of the id in info.postData.id
function sendMessage(info) {
  log("postData received is ***" + info.postData + "***");
  var postData = JSON.parse(info.postData);
  var res = info.res;

  if (typeof (postData) === "undefined") {
    webrtcError("No posted data in JSON format!", res);
    return;
  }

  if (typeof (postData.message) === "undefined") {
    webrtcError("No message received", res);
    return;
  }

  if (typeof (postData.id) === "undefined") {
    webrtcError("No id received with message", res);
    return;
  }

  if (typeof (partner[postData.id]) === "undefined") {
    webrtcError("Invalid id " + postData.id, res);
    return;
  }

  if (typeof (messagesFor[partner[postData.id]]) === "undefined") {
    webrtcError("Invalid id " + postData.id, res);
    return;
  }

  messagesFor[partner[postData.id]].push(postData.message);
  log("Saving message ***" + postData.message  + "*** for delivery to id " + partner[postData.id]);
  webrtcResponse("Saving message ***" + postData.message + "*** for delivery to id " + partner[postData.id], res);
}

exports.send = sendMessage;

// Returns all messages queued for info.postData.id
function getMessage(info) {
  var postData = JSON.parse(info.postData);
  var res = info.res;

  if (typeof postData === "undefined") {
    webrtcError("No posted data in JSON format!", res);
    return;
  }

  if (typeof (postData.id) === "undefined") {
    webrtcError("No id received on get", res);
    return;
  }

  if (typeof (messagesFor[postData.id]) === "undefined") {
    webrtcError("Invalid id " + postData.id, res);
    return;
  }

  log("Sending messages ***" + JSON.stringify(messagesFor[postData.id]) + "*** to id " + postData.id);
  webrtcResponse({ msgs: messagesFor[postData.id] }, res);
  messagesFor[postData.id] = [];
}

exports.get = getMessage;
