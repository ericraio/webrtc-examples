var server = require("./server");
var requestHandlers = require("./serverXHRSignalingChannel");
var log = require("./log");
var port = process.argv[2] || 5000;

function fourchfour(info) {
  var res = info.res;
  log("Request handler fourchfour was called.");
  res.writeHead(404, {"Content-Type": "text/plain"});
  res.write("404 Page Not Found");
  res.end();
}

var handle = {};
handle["/"] = fourchfour;
handle["/connect"] = requestHandlers.connect;
handle["/send"] = requestHandlers.send;
handle["/get"] = requestHandlers.get;

server.serveFilePath("static");
server.start(handle, port);
