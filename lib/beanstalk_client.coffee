net: require 'net'

Client: {

  DEFAULT_ADDR: '127.0.0.1'
  DEFAULT_PORT: 11300

  LOWEST_PRIORITY: 4294967295

  connect: (server, callback) ->
    if server
      [addr, port]: server.split(':')

    if !addr
      addr: Client.DEFAULT_ADDR

    if !port
      port: Client.DEFAULT_PORT

    stream: net.createConnection port, addr
    stream.on 'connect', () ->
      callback(false, new Connection(stream))

    stream.on 'error', (err) ->
      callback(err)

    stream.on 'close', (has_error) ->
      #todo
}

make_command_method: (command_name, expected_response, sends_data) ->
  (args..., callback) ->
    args.unshift command_name

    if sends_data
    	data: args.pop()
    	args.push data.length

    this.send.apply this, args

    if data
    	this.send data

    this.handlers.push([new ResponseHandler(expected_response), callback])

class Connection

  constructor: (stream) ->
    @stream: stream
    @buffer: ''
    @handlers: []
    @stream.on 'data', (data) =>
      @buffer += data
      @try_handling_response()


  end: () ->
    @stream.end()


  try_handling_response: () ->
    [handler, callback]: @handlers[0]

    if handler?
      handler.handle @buffer

      if handler.complete
      	@finished_handling_response();
      	if handler.success
          callback.call(null, false, handler.args...)
      	else
          callback.call(null, handler.args[0])
      else
      	handler.reset()


  finished_handling_response: () ->
    @buffer: ''
    hp: @handlers.shift()
    hp: null

  send: (args...) ->
    @stream.write(args.join(' ') + "\r\n")


  #submitting jobs
  use: make_command_method('use', 'USING')
  put: make_command_method('put', 'INSERTED', true)

  #handling jobs
  watch: make_command_method('watch', 'WATCHING')
  ignore: make_command_method('ignore', 'WATCHING')
  reserve: make_command_method('reserve', 'RESERVED')
  reserve_with_timeout: make_command_method('reserve-with-timeout', 'RESERVED')

  destroy: make_command_method('delete', 'DELETED')
  release: make_command_method('release', 'RELEASED')
  bury: make_command_method('bury', 'BURIED')
  touch: make_command_method('touch', 'TOUCHED')

  #other stuff
  peek: make_command_method('peek', 'FOUND')
  peek_ready: make_command_method('peek-ready', 'FOUND')
  peek_delayed: make_command_method('peek-delayed', 'FOUND')
  peek_buried: make_command_method('peek-buried', 'FOUND')

  kick: make_command_method('kick', 'KICKED')

  stats_job: make_command_method('stats-job', 'OK')
  stats_tube: make_command_method('stats-tube', 'OK')
  stats: make_command_method('stats', 'OK')


class ResponseHandler

  constructor: (success_code) ->
    @success_code: success_code


  reset: () ->
    @complete: false
    @success:  false
    @args: undefined

    @header: undefined
    @body: undefined


  CODES_REQUIRING_BODY: {
    'RESERVED': true
  }

  handle: (data) ->
    i: data.indexOf("\r\n")

    if i >= 0
      @header: data.substr(0, i)
      @body: data.substr(i + 2)
      @args = @header.split(' ')

      code = @args[0]

      if code == @success_code
      	@args.shift() #don't include the code in the success args, but do in the err args
      	@success: true

      if(@CODES_REQUIRING_BODY[code])
      	@parse_body()
      else
      	@complete: true

  parse_body: () ->
    if @body?
      body_length: parseInt(@args[@args.length - 1], 10)

      if @body.length == (body_length + 2)
      	@args.pop() #removed the length and add the data
      	@args.push(@body.substr(0, @body.length-2))
      	@complete: true


exports.Client: Client
