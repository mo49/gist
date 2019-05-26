#!/usr/bin/env node

const fs = require("fs"),
    https = require("https"),
    exec = require("child_process").exec;

const user = process.argv[2],
    token = process.argv[3];

fetchAndClone(1, function callback(error, nextPage) {
  if (error) throw error;
  if (nextPage > 0) {
    fetchAndClone(nextPage, callback);
  } else {
    exec(`git add *; git commit -m "new gist"; git push`, function(error, stdout, stderr) {
      if (error) return callback(error);
    });
  }
});

function fetchAndClone(page, callback) {
  fetch(page, function(error, gists) {
    if (error) return callback(error);
    if (gists.length) ++page; else page = -1;
    cloneNext(gists.pop());

    function cloneNext(gist) {
      if (!gist) return callback(null, page);
      if (directoryExists(gist.id)) return cloneNext(gists.pop());
      console.log(`cloning : ${gist.id}`);

      for(let val in gist.files) {
        const dirName = `${val}@gist`;
        if (directoryExists(dirName)) return cloneNext(gists.pop());
        exec(`git submodule add https://gist.github.com/${user}/${gist.id} ${dirName}`, function(error, stdout, stderr) {
          if (error) return callback(error);
          cloneNext(gists.pop());
        });
        break;
      }
    }
  });
}

function fetch(page, callback) {
  const request = https.request({
    hostname: "api.github.com",
    port: 443,
    path: "/users/" + encodeURIComponent(user) + "/gists?page=" + page,
    method: "GET",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": "token " + token,
      "User-Agent": "mbostock/gist-clone-all"
    }
  }, function(response) {
    let chunks = [];
    response.setEncoding("utf8");
    response.on("data", function(chunk) { chunks.push(chunk); });
    response.on("end", function() { callback(null, JSON.parse(chunks.join(""))); });
  });
  request.on("error", callback);
  request.end();
}

function directoryExists(path) {
  try {
    return fs.lstatSync(path).isDirectory();
  } catch (ignored) {
    return false;
  }
}

