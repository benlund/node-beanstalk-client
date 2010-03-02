var events = require('events'),
    tcp    = require('tcp'),
    Promise= require('./promise').Promise;

var sys  = require('sys');

var Client = {

  DEFAULT_ADDR: '127.0.0.1',
  DEFAULT_PORT: 11300,

  LOWEST_PRIORITY: 4294967295,

  connect: function(server) {
    var addr, port,
      parts,
      promise;

    if(server) {
      parts = server.split(':');
      addr = parts[0];
      port = parts[1];
    }
    if(!addr) {
      addr = this.DEFAULT_ADDR;
    }
    if(!port) {
      port = this.DEFAULT_PORT;
    }

    promise = new Promise();


    var tcp_conn = tcp.createConnection(port, addr);
    tcp_conn.addListener('connect', function() {
		      promise.emitSuccess(Connection.make(tcp_conn));
    });
    tcp_conn.addListener('close', function(had_error) {
		      if(had_error) {
			promise.emitError();
		      }
    });

    return promise;
  }

};

var make_command_method = function(command_name, expected_response, sends_data) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var data;
      args.unshift(command_name);
      var p = this.expect_response(expected_response);
      if(sends_data) {
	data = args.pop();
	args.push(data.length);
      }
      this.send.apply(this, args);
      if(data){
	this.send(data);
      }
      return p;
    };
};

var Connection = {
  make: function(tcp_conn) {
    function F() {}
    F.prototype = this;
    var self = new F();
    self.conn = tcp_conn;
    //self.conn.setNoDelay();
    self.buffer = '';
    self.handlers = [];
    self.conn.addListener('data', function(data) {
			    self.buffer += data;
			    self.try_handling_response();
			  });
    return self;
  },

  close: function() {
    this.conn.close();
  },

  expect_response: function(success_code) {
    var promise = new Promise();
    this.handlers.push([ResponseHandler.make(success_code), promise]);
    return promise;
  },

  try_handling_response: function() {
    var handler, promise;
    var handler_and_promise = this.handlers[0];
    if(handler_and_promise) {
      handler = handler_and_promise[0];
      promise = handler_and_promise[1];

      handler.handle(this.buffer);

      if(handler.complete) {
	this.finished_handling_response();
	if(handler.success) {
	  promise.emitSuccess.apply(promise, handler.args);
	}
	else {
	  promise.emitError.apply(promise, handler.args);
	}
      }
      else {
	handler.reset();
      }
    }
  },

  finished_handling_response: function() {
    this.buffer = '';
    var hp = this.handlers.shift();
    hp = null;
  },

  //handling jobs
  watch: make_command_method('watch', 'WATCHING'),
  ignore: make_command_method('ignore', 'WATCHING'),
  reserve: make_command_method('reserve', 'RESERVED'),
  reserve_with_timeout: make_command_method('reserve-with-timeout', 'RESERVED'),
  destroy: make_command_method('delete', 'DELETED'),

  //submitting jobs
  use: make_command_method('use', 'USING'),
  put: make_command_method('put', 'INSERTED', true),
  bury: make_command_method('bury', 'BURIED'),

//   put: function(priority, delay, ttr, data) {
//     var p = this.expect_response('INSERTED');
//     this.send('put', priority, delay, ttr, data.length);
//     this.send(data);

//     return p;
//   },

  send: function() {
    this.conn.write(Array.prototype.slice.call(arguments).join(' ') + "\r\n");
  }

};

var ResponseHandler = {

  make: function(success_code) {
    function F() {}
    F.prototype = this;
    var self = new F();
    self.success_code = success_code;
    return self;
  },

  reset: function() {
    this.complete = false;
    this.success = false;
    this.args = undefined;

    this.header = undefined;
    this.body = undefined;
  },

  CODES_REQUIRING_BODY: {
    'RESERVED': true
  },

  handle: function(data) {
    var args, code;
    var i = data.indexOf("\r\n");

    if(i >= 0) {
      this.header = data.substr(0, i);
      this.body = data.substr(i + 2);
      this.args = this.header.split(' ');
      code = this.args[0];
      if(code === this.success_code) {
	this.args.shift(); //don't include the code in the success args, but do in the err args
	this.success = true;
      }
      if(this.CODES_REQUIRING_BODY[code]) {
	this.parse_body();
      }
      else {
	this.complete = true;
      }
    }
  },

  parse_body: function() {
    var body_length;
    if('undefined' !== typeof this.body) {
      body_length = parseInt(this.args[this.args.length - 1], 10);
      if(this.body.length === (body_length + 2)) {
	this.args.pop(); //removed the length and add the data
	this.args.push(this.body.substr(0, this.body.length-2));
	this.complete = true;
      }
    }
  }


};

exports.Client = Client;
