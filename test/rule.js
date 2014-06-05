var should = require('should');
var async = require('async');

var token = process.env.WX_TOKEN || 'keyboardcat123';
var port = process.env.PORT || 3000;

var bootstrap = require('./bootstrap.js');
var makeRequest = bootstrap.makeRequest;
var sendRequest = makeRequest('http://localhost:' + port + '/wechat', token);

var app = require('../app.js');

//公用检测指令
var detect = function(info, err, json, content, noContent) {
  should.exist(info);
  should.not.exist(err);
  should.exist(json);
  json.should.have.type('object');
  if (content) {
    json.should.have.property('Content');
    json.Content.should.match(content);
  }
  if (noContent) {
    json.Content.should.not.match(noContent);
  }
};

describe('wechat1', function() {
  //初始化
  var info = null;
  beforeEach(function() {
    info = {
      sp: 'webot',
    user: 'client',
    type: 'text'
    };
  });

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

  //测试文本消息
  describe('text', function() {

    //检测more指令
    it('should return more msg', webot.test
      .input('more').output.match(/指令/)
      .end);

    it('should pass multi line yaml', webot.test
      .input('帮助').output.match(/，\n/)
      .end);

    //检测who指令
    it('should return who msg', webot.test
      .input('who').output.match(/机器人/)
      .end);

    //检测name指令
    it('should return name msg', webot.test
      .input('I am a mocha tester').output.match(/a mocha tester/)
      .end);

    //检测time指令
    it('should return time msg', webot.test
        .input('几点了').output.match(/时间/)
        .end);

    //检测不匹配指令
    it('should return not_match msg', webot.test
        .input('#$%^&!@#$').output.match(/我太笨了/)
        .end);
  });

  //测试dialog消息
  describe('dialog', function() {
    //检测key指令
    it('should return key msg', webot.test
      .input('key aaaa').output.match(/aaaa/)
      .end);

    it('should not return as unknown for key input', webot.test
      .input('key aaaa').output.notmatch(/太笨了/)
      .end);

    //检测hello指令
    it('should return hello msg', webot.test
      .input('hello').output.match(/你好|fine|(how are you)/)
      .end);

    //检测yaml指令
    it('should return yaml msg', webot.test
      .input('yaml').output.match(/这是一个yaml的object配置/)
      .end);
  });

  describe('qidu', function() {
    it('should pass guess sex', webot.test
      .input('你是男人还是女人').output.match(/猜猜看/)
      .input('哈哈').output.match(/还猜不猜嘛/)
      .input('男的').output.match(/是的/)
      .end);
  });

  //测试wait
  describe('wait', function() {
    //检测sex指令
    it('should pass guess sex', webot.test
      .input('你是男人还是女人').output.match(/猜猜看/)
      .input('哈哈').output.match(/还猜不猜嘛/)
      .input('男的').output.match(/是的/)
      .end);

    //检测game指令
    it('should pass game-no-found', webot.test
      .input('game 1').output.match(/游戏/)
      .input('2').output.match(/再猜/)
      .input('3').output.match(/再猜/)
      .input('4').output.match(/答案是/)
      .end);

    //检测game指令
    it('should return game-found msg', webot.test
      .input('game 1').output.match(/游戏/)
      .input('2').output.match(/再猜/)
      .input('3').output.match(/再猜/)
      .input('1').output.match(/聪明/)
      .end);

    //检测suggest_keyword指令
    it('should return keyword correction accepted result.', webot.test
        .input('s nde').output.match(/拼写错误.*nodejs/)
        .input('y').output.match(/百度搜索.*nodejs/)
        .end);

    //检测suggest_keyword指令
    it('should return refused keyword correction result.', webot.test
        .input('s nde').output.match(/拼写错误.*nodejs/)
        .input('n').output.match(/百度搜索.*nde/)
        .end);

    //检测search指令
    it('should return search msg', webot.test
        .input('s javascript').output.match(/百度搜索.*javascript/)
        .end);

    //检测timeout指令
    it('should pass not timeout', function(done) {
      info.text = 'timeout';
      sendRequest(info, function(err, json) {
        detect(info, err, json, /请等待/);
        setTimeout(function() {
          info.text = 'Hehe...';
          sendRequest(info, function(err, json) {
            detect(info, err, json, new RegExp('输入了: ' + info.text));
            done();
          });
        }, 2000);
      });
    });

    //检测timeout指令
    it('should return timeout msg', function(done) {
      info.text = 'timeout';
      sendRequest(info, function(err, json) {
        detect(info, err, json, /请等待/);
        setTimeout(function() {
          info.text = 'timeout ok';
          sendRequest(info, function(err, json) {
            detect(info, err, json, /超时/);
            done();
          });
        }, 5100);
      });
    });

    it('should handle list', webot.test
        .input('ok webot').output.match(/可用指令/)
        .input('2').output.match(/请选择人名/)
        .input('3').output.match(/请输入/)
        .input('David').output.match(/输入了 David/)
        .end);
  });

  //测试地理位置
  describe('location', function() {
    //检测check_location指令
    it('should return check_location msg', function(done) {
      info.type = 'location';
      info.xPos = '23.08';
      info.yPos = '113.24';
      info.scale = '12';
      info.label = '广州市 某某地点';
      sendRequest(info, function(err, json) {
        detect(info, err, json, /广州/);
        done();
      });
    });
  });

  //测试图片
  describe('image', function() {
    //检测check_location指令
    it('should return good hash', function(done) {
      info.type = 'image';
      info.pic = 'http://www.baidu.com/img/baidu_sylogo1.gif';
      sendRequest(info, function(err, json) {
        detect(info, err, json, /图片/);
        json.Content.should.include('你的图片');
        done()
      });
    });
  });

  //测试图文消息
  describe('news', function() {
    //检测首次收听指令
    it('should return subscribe message.', function(done) {
      info.type = 'event';
      info.event = 'subscribe';
      info.eventKey = '';
      sendRequest(info, function(err, json) {
        detect(info, err, json);
        json.should.have.property('MsgType', 'news');
        json.Articles.item.should.have.length(json.ArticleCount);
        json.Articles.item[0].Title[0].toString().should.match(/感谢你收听/);
        done();
      });
    });

    //检测image指令
    it('should return news msg', function(done) {
      info.type = 'text';
      info.text = 'news';
      sendRequest(info, function(err, json) {
        detect(info, err, json);
        json.should.have.property('MsgType', 'news');
        json.Articles.item.should.have.length(json.ArticleCount);
        json.Articles.item[0].Title[0].toString().should.match(/微信机器人/);
        done();
      });
    });
  });

});
