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
    info.text = textReq;
    sendRequest(info, function(err, json) {
      detect(info, err, json, textInRes, textNotInRes);
      if (next) { next(); }
    });
  };

  var itText = function(message, textReq, textInRes, textNotInRes) {
    it(message, function(done) {
      textReqRes(textReq, textInRes, textNotInRes, done);
    });
  };

  var itTextSeries = function() {
    var args = arguments;

    it(args[0], function(done) {
      var funcs = [];
      for (var i = 1; i < args.length; i++) {
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
    });
  };

  //测试文本消息
  describe('text', function() {
    //检测more指令
    itText('should return more msg', 'more', /指令/);

    itText('should pass multi line yaml', '帮助', /，\n/);

    //检测who指令
    itText('should return who msg', 'who' , /机器人/);

    //检测name指令
    itText('should return name msg', 'I am a mocha tester', /a mocha tester/);

    //检测time指令
    itText('should return time msg', '几点了', /时间/);

    //检测不匹配指令
    itText('should return not_match msg', '#$%^&!@#$', /我太笨了/);
  });

  //测试dialog消息
  describe('dialog', function() {
    //检测key指令
    itText('should return key msg', 'key aaaa', /aaaa/);

    itText('should not return as unknown for key input', 'key aaaa', null, /太笨了/);

    //检测hello指令
    itText('should return hello msg', 'hello', /你好|fine|(how are you)/);

    //检测yaml指令
    itText('should return yaml msg', 'yaml', /这是一个yaml的object配置/);
  });

  //测试wait
  describe('wait', function() {
    //检测sex指令
    itTextSeries('should pass guess sex',
      ['你是男人还是女人' , /猜猜看/],
      ['哈哈', /还猜不猜嘛/],
      ['男的', /是的/]);

    //检测game指令
    itTextSeries('should pass game-no-found',
        ['game 1', /游戏/],
        ['2',/再猜/],
        ['3', /再猜/],
        ['4', /答案是/]);

    //检测game指令
    it('should return game-found msg', function(done) {
        info.text = 'game 1';
        sendRequest(info, function(err, json) {
            detect(info, err, json, /游戏/);
            info.text = '2';
            sendRequest(info, function(err, json) {
                detect(info, err, json, /再猜/);
                info.text = '3';
                sendRequest(info, function(err, json) {
                    detect(info, err, json, /再猜/);
                    info.text = '1';
                    sendRequest(info, function(err, json) {
                        detect(info, err, json, /聪明/);
                        done();
                    });
                });
            });
        });
    });

    //检测suggest_keyword指令
    it('should return keyword correction accepted result.', function(done) {
        info.text = 's nde';
        sendRequest(info, function(err, json) {
            detect(info, err, json,/拼写错误.*nodejs/);
            //下次回复
            info.text = 'y';
            sendRequest(info, function(err, json) {
                detect(info, err, json, /百度搜索.*nodejs/);
                done();
            });
        });
    });

    //检测suggest_keyword指令
    it('should return refused keyword correction result.', function(done) {
        info.text = 's nde';
        sendRequest(info, function(err, json) {
            detect(info, err, json,/拼写错误.*nodejs/);
            //下次回复
            info.text = 'n';
            sendRequest(info, function(err, json) {
                detect(info, err, json, /百度搜索.*nde/);
                done();
            });
        });
    });

    //检测search指令
    itText('should return search msg', 's javascript' , /百度搜索.*javascript/);

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

    it('should handle list', function(done) {
        info.text = 'ok webot';
        sendRequest(info, function(err, json) {
            detect(info, err, json, /可用指令/);
            info.text = '2';
            sendRequest(info, function(err, json) {
                detect(info, err, json, /请选择人名/);
                info.text = '3';
                sendRequest(info, function(err, json) {
                    detect(info, err, json, /请输入/);
                    info.text = 'David';
                    sendRequest(info, function(err, json) {
                        detect(info, err, json, /输入了 David/);
                        done();
                    });
                });
            });
        });
    });
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
