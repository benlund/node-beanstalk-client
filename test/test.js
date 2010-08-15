var sys = require('sys');
var client = require('../lib/beanstalk_client').Client;

client.connect('127.0.0.1:11300', function(err, conn) {
  var job_data = {"data": {"name": "node-beanstalk-client"}};
  conn.put(0, 0, 1, JSON.stringify(job_data), function(job_id) {
    sys.puts('put job: ' + job_id);

    conn.reserve(function(job_id, job_json) {
      sys.puts('got job: ' + job_id);
      sys.puts('got job data: ' + job_json);
      sys.puts('module name is ' + JSON.parse(job_json).data.name);
      conn.destroy(job_id, function() {
	sys.puts('destroyed job');
      });
    });

  });
});
