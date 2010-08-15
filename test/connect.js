(function(){
  var client, sys;
  sys = require('sys');
  client = require('../lib/beanstalk_client').Client;
  //producer
  client.connect(null, function(err, conn) {
    if (err) {
      sys.puts('Producer connection error:', sys, inspect(err));
    } else {

    }
    sys.puts('Producer connected');
    return conn.use('test', function() {
      return conn.put(0, 0, 1, 'hiben', function(err, job_id) {
        return sys.puts('Producer sent job: ' + job_id);
      });
    });
  });
  //consumer
  client.connect(null, function(err, conn) {
    if (err) {
      return sys.puts('Consumer connection error:', sys, inspect(err));
    } else {
      sys.puts('Consumer connected');
      return conn.watch('test', function(err) {
        return conn.reserve(function(err, job_id, data) {
          sys.puts('Consumer got job: ' + job_id);
          sys.puts('  job data: ' + data);
          return conn.destroy(job_id, function(err) {
            return sys.puts('Consumer destroyed job: ' + job_id);
          });
        });
      });
    }
  });
})();
