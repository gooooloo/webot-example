var should = require('should');
var async = require('async');
var bootstrap = require('./bootstrap.js');
var makeRequest = bootstrap.makeRequest;

var testCase = function(textReqRes){
  this.args = [];
  this.textReqRes = textReqRes;
};

testCase.prototype = {

  get output() {
    return this;
  },

  get should() {
    return this;
  },

  match : function (text) {
    this.args[this.args.length - 1][1] = text;
    return this;
  },

  notmatch : function (text) {
    this.args[this.args.length - 1][2] = text;
    return this;
  },

  input : function (text) {
    this.args.push([text]);
    return this;
  },

  timeout : function (timeoutMs) {
    if (this.args.length > 0) {
      this.args[this.args.length - 1][3] = timeoutMs;
    }
    return this;
  },

  get end() {
    var args = this.args;
    var textReqRes = this.textReqRes;
    return function(done){
      if (args.length == 1) {
        textReqRes(args[0][0], args[0][1], args[0][2], done, args[0][3]);
      } else if (args.length > 1) {
        var funcs = [];
        for (var i = 0; i < args.length; i++) {
          var func = function(k) {
            // have to save 'i' value for later execution.
            return function(callback) {
              var arg = args[k];
              var next = function(){ callback(null); };
              textReqRes(arg[0], arg[1], arg[2], next, arg[3]);
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

  var textReqRes = function(textReq, textInRes, textNotInRes, next, timeOutOfNext) {
    var info = {
      sp: 'webot',
      user: 'client',
      type: 'text'
    };
    info.text = textReq;
    sendRequest(info, function(err, json) {
      detect(info, err, json, textInRes, textNotInRes);
      if (next) {
        if (timeOutOfNext) {
          setTimeout(next, timeOutOfNext);
        } else {
          next();
        }
      }
    });
  }

  return {
    get begin() { return new testCase(textReqRes); }
  };
};
module.exports = exports = webot;
