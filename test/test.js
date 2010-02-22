var sys = require('sys');
var bt = require('../lib/beanstalk_client');

bt.Client.connect('127.0.0.1:11300').addCallback(function(conn) {
  var job_data = {"data": {"name": "node-beanstalk-client"}};
  conn.put(0, 0, 1, JSON.stringify(job_data)).addCallback(function(job_id) {

    sys.puts('put job: ' + job_id);

    conn.reserve().addCallback(function(job_id, job_json) {
      sys.puts('got job: ' + job_id);
      sys.puts('got job data: ' + job_json);
      sys.puts('module name is ' + JSON.parse(job_json).data.name);
      conn.destroy(job_id);
    });

  });
});
