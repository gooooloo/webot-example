var should = require('should');
var async = require('async');
var bootstrap = require('./bootstrap.js');
var makeRequest = bootstrap.makeRequest;

// IOCases is designed to make writing test codes easier for
// verifying output given a input. Typically codes would be
// like this:
//
//   new IOCases(ioHandler)
//     .input('****').output.should.match('****')
//     .end;
//
// or for multiple Input/Output pairs like this:
//
//   new IOCases(ioHandler)
//     .input('****').output.should.match('****')
//     .input('****').output.should.match('****')
//     .end;
//
// or if you want to set time out before 2 Input/Output pairs:
//
//   new IOCases(ioHandler)
//     .input('****').output.should.match('****')
//     .timeout(5000)
//     .input('****').output.should.match('****')
//     .end;
//
var IOCases = function(ioHandler){
  this.ioCases = [];
  this.ioHandler = ioHandler;
};

IOCases.prototype = {

  get output() {
    return this;
  },

  get should() {
    return this;
  },

  match : function (text) {
    this.ioCases[this.ioCases.length - 1]['match'] = text;
    return this;
  },

  notmatch : function (text) {
    this.ioCases[this.ioCases.length - 1]['nomatch'] = text;
    return this;
  },

  input : function (text) {
    var io = {};
    io['input'] = text;
    this.ioCases.push(io);
    return this;
  },

  timeout : function (timeoutMs) {
    if (this.ioCases.length > 0) {
      this.ioCases[this.ioCases.length - 1]['timeout'] = timeoutMs;
    }
    return this;
  },

  get end() {
    var ioCases = this.ioCases;
    var ioHandler = this.ioHandler;
    return function(done){
      if (ioCases.length == 1) {
        ioCases[0]['next'] = done;
	ioHandler(ioCases[0]);
      } else if (ioCases.length > 1) {
        var funcs = [];
        for (var i = 0; i < ioCases.length; i++) {
          var func = function(k) {
            // have to save 'i' value for later execution.
            return function(callback) {
              var arg = ioCases[k];
              arg['next'] = function(){ callback(null); };
              ioHandler(arg);
            };
          }(i);
          funcs.push(func);
        }

        async.series(funcs, function(err, result){ done(); });
      }
    };
  }
};

var detect = function(info, err, json, content){
  should.exist(info);
  should.not.exist(err);
  should.exist(json);
  json.should.have.type('object');
  if(content){
    json.should.have.property('Content');
    json.Content.should.match(content);
  }
};

var webot = function(){};
webot.test = function(url, token){

  var sendRequest = makeRequest(url, token);

  var ioHandler = function(ioCase) {
    var info = {
      sp: 'webot',
      user: 'client',
      type: 'text',
      text: ioCase['input']
    };
    sendRequest(info, function(err, json) {
      detect(info, err, json, ioCase['match'], ioCase['nomatch']);
      if (ioCase['next']) {
        if (ioCase['timeout']) {
          setTimeout(ioCase['next'], ioCase['timeout']);
        } else {
          ioCase['next']();
        }
      }
    });
  }

  return {
    get begin() { return new IOCases(ioHandler); }
  };
};

module.exports = exports = webot;
