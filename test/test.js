var fs, naught_bin, path, naught_main, assert, async, exec, spawn, steps, root, test_root, http, port;

fs = require('fs');
http = require('http');
spawn = require('child_process').spawn;
path = require("path");
assert = require("assert");
async = require("async");

root = path.join(__dirname, "..");
test_root = path.join(root, "test");
naught_main = path.join(root, "lib", "main.js");
port = 11904;

function assertEqual(actual, expected) {
  assert(actual === expected, "actual:\n" + actual + "\nexpected:\n" + expected);
}

function exec(cmd, args, opts, cb){
  var bin, stdout, stderr;
  if (args == null) args = []
  if (opts == null) opts = {}
  if (cb == null) cb = function(){};
  bin = spawn(cmd, args, opts);
  stdout = ""
  bin.stdout.on('data', function(data) {
    stdout += data;
  });
  stderr = ""
  bin.stderr.on('data', function(data) {
    stderr += data;
  });
  bin.on('exit', function(code, signal) {
    cb(stdout, stderr, code, signal);
  });
}

function import$(obj, src){
  var key, own = {}.hasOwnProperty;
  for (key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}

function naught_exec(args, env, cb) {
  if (env == null) env = {}
  import$(import$({}, process.env), env)
  exec("node", [naught_main].concat(args), {
    cwd: __dirname,
    env: env
  }, function(stdout, stderr, code, signal) {
    cb(stdout, stderr, code);
  });
}

steps = [
  // ability to start a server
  function (cb) {
    naught_exec(["start", "server.js"], {PORT: port}, function(stdout, stderr, code) {
      assertEqual(stderr, "event: Bootup, old: 0, new: 0, dying: 0\n")
      assertEqual(stdout, "server is running\nworkers online: 1\n")
      assertEqual(code, 0)
      cb();
    });
  },
  // starting a server twice prints the status of the running server
  function (cb) {
    naught_exec(["start", "server.js"], {PORT: port}, function(stdout, stderr, code) {
      assertEqual(stderr, "");
      assertEqual(stdout, "server is running\nworkers online: 1\n");
      assertEqual(code, 1)
      cb();
    });
  },
  // ability to query status of a running server
  function (cb) {
    naught_exec(["status"], {}, function(stdout, stderr, code) {
      assertEqual(stderr, "");
      assertEqual(stdout, "server is running\nworkers online: 1\n");
      assertEqual(code, 0)
      cb();
    });
  },
  // make sure the server is up
  function (cb) {
    http.get("http://localhost:11904/hi", function (res) {
      var body;
      assertEqual(res.statusCode, 200);
      body = ""
      res.on('data', function(data) {
        body += data;
      });
      res.on('end', function() {
        assertEqual(body, "hi");
        cb();
      });
    });
  },
  // ability to deploy to a running server
  function (cb) {
    naught_exec(["status"], {}, function(stdout, stderr, code) {
      assertEqual(stderr, "");
      assertEqual(stdout, "server is running\nworkers online: 1\n");
      assertEqual(code, 0)
      cb();
    });
  },
  // ability to stop a running server
  function (cb) {
    naught_exec(["stop"], {}, function(stdout, stderr, code) {
      assertEqual(stderr, "event: ShutdownOld, old: 1, new: 0, dying: 0\nevent: OldExit, old: 0, new: 0, dying: 1\n");
      assertEqual(stdout, "");
      assertEqual(code, 0)
      cb();
    });
  },
  // stopping a server twice prints helpful output
  function (cb) {
    naught_exec(["stop"], {}, function(stdout, stderr, code) {
      assertEqual(stdout, "");
      assertEqual(stderr, "server not running\n");
      assertEqual(code, 1)
      cb();
    });
  },
  // server writes to default log files
  function (cb) {
    async.parallel([
      function (cb) {
        fs.unlink(path.join(test_root, "naught.log"), cb);
      },
      function (cb) {
        fs.unlink(path.join(test_root, "stderr.log"), cb);
      },
      function (cb) {
        fs.unlink(path.join(test_root, "stdout.log"), cb);
      },
    ], cb);
  },
];

async.series(steps, function(err) {
  assert.ifError(err);
  console.error("pass");
});
