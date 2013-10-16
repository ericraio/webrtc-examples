var http = require("http");
var url = require("url");
var fs = require("fs");

var log = require("./log");
var serveFileDir = "";


// Sets the path to the static files (HTML, JS, etc.)
function setServeFilePath(p) {
  serveFilePath = p;
}

exports.serveFilePath = setServeFilePath;

// Creates a handler to collect POSTed data and to route the 
// request based on the path name
function start(handle, port) {
  function onRequest(req, res) {
    var urldata = url.parse(req.url, true);
    var pathname = urldata.pathname;
    var info = { 
      res: res,
      query: urldata.query,
      postData: ""
    };
    log("Request for " + pathname + " received");
    req.setEncoding("utf8");
    req.addListener("data", function(postDataChunk) {
      info.postData += postdataChunk
      log("Received POST data chunk '" + postDataChunk + "'.");
    });
    req.addListener("end", function() {
      route(handle, pathname, info);
    });
  }
  http.createServer(onRequest).listen(port);

  log("Server started on port " + port);
}

exports.start = start;

// Determines whether request path is a static file or a custom
// path with its own handler
function route(handle, pathname, info) {
  log("About to route a request for " + pathname);
  // Check if path after leading slash is an existing file that
  // can be served
  var filepath = createFilePath(pathname);
  log("Attempting to locate " + filepath);
  fs.stat(filepath, function(err, stats) {
    if (!err && stats.isFile()) {
      serveFile(filepath, info);
    } else {
      handleCustom(handle, pathname, info);
    }
  });
}

// This function adds the serveFilePath to the beginning of the 
// given pathname after removing .., ~, and other such 
// problematic syntax bits from a security perspective.
// ** There is no claim that this is now secure **
function createFilePath(pathname) {
  var components = pathname.substr(1).split("/");
  var filtered = new Array(), temp;

  for(var i=0, len = components.length; i < len; i++) {
    temp = components[i];
    if (temp == "..") continue;
    if (temp == "") continue;
    temp = temp.replace(/~/g, "");
    filtered.push(temp);
  }
  return (serveFilePath + "/" + filtered.join("/"));
}

// Opens, reads, and sends to the client the contents of the 
// named file
function serveFile(filepath, info) {
  var res = info.res;
  var query = info.query;

  log("Serving file " + filepath);
  fs.open(filepath, "r", function(err, fd) {
    if (err) {
      log(err.message);
      noHandlerErr(filepath, res);
      return;
    }
    var readBuffer = new Buffer(20480);
    fs.read(fd, readBuffer, 0, 20480, 0, function(err, readBytes) {
      log('just read ' + readBytes + ' bytes');
      if (readBytes > 0) {
        res.writeHead(200, {"Content-Type": contentType(filepath) });
        res.write(addQuery(readBuffer.toString('utf8', 0, readBytes), query));
      }
      res.end();
    });
  });
}

// Determine content type of fetched file
function contentType(filepath) {
  var index = filepath.lastIndexOf('.');

  if (index >= 0) {
    switch (filepath.substr(index+1)) {
      case "html": return ("text/html");
      case "js": return ("applicaiton/javascript");
      case "css": return ("text/css");
      case "txt": return ("text/plain");
      default: return ("text/html");
    }
  }

  return ("text/html");
}

// Intended to be used on an HTML file, this funciton replaces
// the first empty script block in the file with an object
// representing all query parameters included on the URI of the 
// request
function addQuery(str, q) {
  if (q) {
    return str.replace('<script></script>', '<script>var queryparams = ' + JSON.stringify(q) + ';</script>');
  } else {
    return str;
  }
}


// Confirm handler for non-file path, then execute it
function handleCustom(handle, pathname, info) {
  if (typeof handle[pathname] == 'function') {
    handle[pathname](info);
  } else {
    noHandlerErr(pathname, info.res);
  }
}

// If no handler is defined for the request, return 404;
function noHandlerErr(pathname, res) {
  log("No request handler found for " + pathname);
  res.writeHead(404, {"Content-Type": "text/plain"});
  res.write("404 Page Not Found");
  res.end();
}
