var should = require('should');

var token = process.env.WX_TOKEN || 'keyboardcat123';
var token2 = process.env.WX_TOKEN_2 || 'weixinToken2';
var port = process.env.PORT || 3000;

var bootstrap = require('./bootstrap.js');
var makeRequest = bootstrap.makeRequest;
var sendRequest = makeRequest('http://localhost:' + port + '/wechat', token);
var sendRequest2 = makeRequest('http://localhost:' + port + '/wechat_2', token2);

var webot = require('./webot.io.util');

var app = require('../app.js');

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

describe('wechat2', function(){
  //初始化
  var info = null;
  beforeEach(function(){
    info = {
      sp: 'webot',
    user: 'client',
    type: 'text'
    };
  });

  //测试文本消息
  describe('text', function(){
    //检测more指令
    it('should return hi', function(done){
      info.text = 'hello';
      sendRequest2(info, function(err, json){
        detect(info, err, json, /^hi.$/);
        done();
      });
    });
  });
});

describe('wechat1', function(){
  //初始化
  var info = null;
  beforeEach(function(){
    info = {
      sp: 'webot',
    user: 'client',
    type: 'text'
    };
  });

  var iotest = webot.test('http://localhost:' + port + '/wechat', token);

  //测试文本消息
  describe('text', function() {

    //检测more指令
    it('should return more msg', iotest
      .input('more').output.should.match(/指令/)
      .end);

    it('should pass multi line yaml', iotest
      .input('帮助').output.should.match(/，\n/)
      .end);

    //检测who指令
    it('should return who msg', iotest
      .input('who').output.should.match(/机器人/)
      .end);

    //检测name指令
    it('should return name msg', iotest
      .input('I am a mocha tester').output.should.match(/a mocha tester/)
      .end);

    //检测time指令
    it('should return time msg', iotest
        .input('几点了').output.should.match(/时间/)
        .end);

    //检测不匹配指令
    it('should return not_match msg', iotest
        .input('#$%^&!@#$').output.should.match(/我太笨了/)
        .end);
  });

  //测试dialog消息
  describe('dialog', function() {
    //检测key指令
    it('should return key msg', iotest
      .input('key aaaa').output.should.match(/aaaa/)
      .end);

    it('should not return as unknown for key input', iotest
      .input('key aaaa').output.should.notmatch(/太笨了/)
      .end);

    //检测hello指令
    it('should return hello msg', iotest
      .input('hello').output.should.match(/你好|fine|(how are you)/)
      .end);

    //检测yaml指令
    it('should return yaml msg', iotest
      .input('yaml').output.should.match(/这是一个yaml的object配置/)
      .end);
  });

  //测试wait
  describe('wait', function() {
    //检测sex指令
    it('should pass guess sex', iotest
      .input('你是男人还是女人').output.should.match(/猜猜看/)
      .input('哈哈').output.should.match(/还猜不猜嘛/)
      .input('男的').output.should.match(/是的/)
      .end);

    //检测game指令
    it('should pass game-no-found', iotest
      .input('game 1').output.should.match(/游戏/)
      .input('2').output.should.match(/再猜/)
      .input('3').output.should.match(/再猜/)
      .input('4').output.should.match(/答案是/)
      .end);

    //检测game指令
    it('should return game-found msg', iotest
      .input('game 1').output.should.match(/游戏/)
      .input('2').output.should.match(/再猜/)
      .input('3').output.should.match(/再猜/)
      .input('1').output.should.match(/聪明/)
      .end);

    //检测suggest_keyword指令
    it('should return keyword correction accepted result.', iotest
        .input('s nde').output.should.match(/拼写错误.*nodejs/)
        .input('y').output.should.match(/百度搜索.*nodejs/)
        .end);

    //检测suggest_keyword指令
    it('should return refused keyword correction result.', iotest
        .input('s nde').output.should.match(/拼写错误.*nodejs/)
        .input('n').output.should.match(/百度搜索.*nde/)
        .end);

    //检测search指令
    it('should return search msg', iotest
        .input('s javascript').output.should.match(/百度搜索.*javascript/)
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

    it('should handle list', iotest
        .input('ok webot').output.should.match(/可用指令/)
        .input('2').output.should.match(/请选择人名/)
        .input('3').output.should.match(/请输入/)
        .input('David').output.should.match(/输入了 David/)
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
