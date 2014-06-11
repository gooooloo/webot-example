var should = require('should');
var async = require('async');
var bootstrap = require('./bootstrap.js');
var makeRequest = bootstrap.makeRequest;

//公用检测指令
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

var textReqRes = function(textReq, textInRes, textNotInRes, next) {
  var info = {
    sp: 'webot',
    user: 'client',
    type: 'text'
  };
  info.text = textReq;
  sendRequest(info, function(err, json) {
    detect(info, err, json, textInRes, textNotInRes);
    if (next) { next(); }
  });
}

var webot = function(){};
webot.test = function(){};
webot.test.input = function(text){

  var testCase = function(){};

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

    get end() {
      var args = this.args;
      return function(done){
        if (args.length == 1) {
          textReqRes(args[0][0], args[0][1], args[0][2], done);
        } else if (args.length > 1) {
          var funcs = [];
          for (var i = 0; i < args.length; i++) {
            var func = function(k) {
              // have to save 'i' value for later execution,
              // we need to write it in this way.
              return function(callback) {
                var arg = args[k];
                var next = function(){ callback(null); };
                textReqRes(arg[0], arg[1], arg[2], next);
              };
            }(i);
            funcs.push(func);
          }

          async.series(funcs, function(err, result){ done(); });
        }
      };
    }
  };

  var ret = new testCase();
  ret.args = [[text]];
  return ret;
};
module.exports = exports = webot;
