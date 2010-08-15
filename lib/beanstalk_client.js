(function(){
  var Client, Connection, ResponseHandler, make_command_method, net;
  var __slice = Array.prototype.slice, __bind = function(func, obj, args) {
    return function() {
      return func.apply(obj || {}, args ? args.concat(__slice.call(arguments, 0)) : arguments);
    };
  };
  net = require('net');
  Client = {
    DEFAULT_ADDR: '127.0.0.1',
    DEFAULT_PORT: 11300,
    LOWEST_PRIORITY: 4294967295,
    connect: function(server, callback) {
      var _a, addr, port, stream;
      if (server) {
        _a = server.split(':');
        addr = _a[0];
        port = _a[1];
      }
      !addr ? (addr = Client.DEFAULT_ADDR) : null;
      !port ? (port = Client.DEFAULT_PORT) : null;
      stream = net.createConnection(port, addr);
      stream.on('connect', function() {
        return callback(false, new Connection(stream));
      });
      stream.on('error', function(err) {
        return callback(err);
      });
      return stream.on('close', function(has_error) {      });
      //todo
    }
  };
  make_command_method = function(command_name, expected_response, sends_data) {
    return function() {
      var args, data;
      var _a = arguments.length, _b = _a >= 2, callback = arguments[_b ? _a - 1 : 0];
      args = __slice.call(arguments, 0, _a - 1);
      args.unshift(command_name);
      if (sends_data) {
        data = args.pop();
        args.push(data.length);
      }
      this.send.apply(this, args);
      data ? this.send(data) : null;
      return this.handlers.push([new ResponseHandler(expected_response), callback]);
    };
  };
  Connection = function(stream) {
    this.stream = stream;
    this.buffer = '';
    this.handlers = [];
    this.stream.on('data', __bind(function(data) {
        this.buffer += data;
        return this.try_handling_response();
      }, this));
    return this;
  };
  Connection.prototype.end = function() {
    return this.stream.end();
  };
  Connection.prototype.try_handling_response = function() {
    var _a, callback, handler;
    _a = this.handlers[0];
    handler = _a[0];
    callback = _a[1];
    if ((typeof handler !== "undefined" && handler !== null)) {
      handler.handle(this.buffer);
      if (handler.complete) {
        this.finished_handling_response();
        if (handler.success) {
          return callback.call.apply(callback, [null, false].concat(handler.args));
        } else {
          return callback.call(null, handler.args[0]);
        }
      } else {
        return handler.reset();
      }
    }
  };
  Connection.prototype.finished_handling_response = function() {
    var hp;
    this.buffer = '';
    hp = this.handlers.shift();
    hp = null;
    return hp;
  };
  Connection.prototype.send = function() {
    var args;
    var _a = arguments.length, _b = _a >= 1;
    args = __slice.call(arguments, 0, _a - 0);
    return this.stream.write(args.join(' ') + "\r\n");
  };
  //submitting jobs
  Connection.prototype.use = make_command_method('use', 'USING');
  Connection.prototype.put = make_command_method('put', 'INSERTED', true);
  //handling jobs
  Connection.prototype.watch = make_command_method('watch', 'WATCHING');
  Connection.prototype.ignore = make_command_method('ignore', 'WATCHING');
  Connection.prototype.reserve = make_command_method('reserve', 'RESERVED');
  Connection.prototype.reserve_with_timeout = make_command_method('reserve-with-timeout', 'RESERVED');
  Connection.prototype.destroy = make_command_method('delete', 'DELETED');
  Connection.prototype.release = make_command_method('release', 'RELEASED');
  Connection.prototype.bury = make_command_method('bury', 'BURIED');
  Connection.prototype.touch = make_command_method('touch', 'TOUCHED');
  //other stuff
  Connection.prototype.peek = make_command_method('peek', 'FOUND');
  Connection.prototype.peek_ready = make_command_method('peek-ready', 'FOUND');
  Connection.prototype.peek_delayed = make_command_method('peek-delayed', 'FOUND');
  Connection.prototype.peek_buried = make_command_method('peek-buried', 'FOUND');
  Connection.prototype.kick = make_command_method('kick', 'KICKED');
  Connection.prototype.stats_job = make_command_method('stats-job', 'OK');
  Connection.prototype.stats_tube = make_command_method('stats-tube', 'OK');
  Connection.prototype.stats = make_command_method('stats', 'OK');

  ResponseHandler = function(success_code) {
    this.success_code = success_code;
    return this;
  };
  ResponseHandler.prototype.reset = function() {
    this.complete = false;
    this.success = false;
    this.args = undefined;
    this.header = undefined;
    this.body = undefined;
    return this.body;
  };
  ResponseHandler.prototype.CODES_REQUIRING_BODY = {
    'RESERVED': true
  };
  ResponseHandler.prototype.handle = function(data) {
    var code, i;
    i = data.indexOf("\r\n");
    if (i >= 0) {
      this.header = data.substr(0, i);
      this.body = data.substr(i + 2);
      this.args = this.header.split(' ');
      code = this.args[0];
      if (code === this.success_code) {
        this.args.shift();
        //don't include the code in the success args, but do in the err args
        this.success = true;
      }
      if ((this.CODES_REQUIRING_BODY[code])) {
        return this.parse_body();
      } else {
        this.complete = true;
        return this.complete;
      }
    }
  };
  ResponseHandler.prototype.parse_body = function() {
    var _a, body_length;
    if ((typeof (_a = this.body) !== "undefined" && _a !== null)) {
      body_length = parseInt(this.args[this.args.length - 1], 10);
      if (this.body.length === (body_length + 2)) {
        this.args.pop();
        //removed the length and add the data
        this.args.push(this.body.substr(0, this.body.length - 2));
        this.complete = true;
        return this.complete;
      }
    }
  };

  exports.Client = Client;
})();
