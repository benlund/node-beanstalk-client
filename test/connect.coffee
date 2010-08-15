sys: require('sys')
client: require('../lib/beanstalk_client').Client

#producer
client.connect null, (err, conn) ->
  if err
    sys.puts 'Producer connection error:', sys,inspect(err)
  else
		sys.puts('Producer connected')

		conn.use 'test', () ->
      conn.put 0, 0, 1, 'hiben', (err, job_id) ->
        sys.puts('Producer sent job: ' + job_id)


#consumer
client.connect null, (err, conn) ->
  if err
    sys.puts 'Consumer connection error:', sys,inspect(err)
  else
    sys.puts('Consumer connected')

    conn.watch 'test', (err) ->

      conn.reserve (err, job_id, data) ->
        sys.puts('Consumer got job: ' + job_id)
        sys.puts('  job data: ' + data)

        conn.destroy job_id, (err) ->
          sys.puts('Consumer destroyed job: ' + job_id)
