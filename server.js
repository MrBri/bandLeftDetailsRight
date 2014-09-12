var Hapi = require('hapi'),
  bands = require('./bands.json'),
  util = require('util'),
  redis = require('redis'),
  client = redis.createClient(),
  bandNames = [],
  bandId,

  options = {
    state: {
      cookies: {
        failAction: 'log'
      }
    },
    views: {
      engines: { ejs: require('ejs') },
      path: __dirname + '/templates',
      layout: true,
    }
  },

  server = Hapi.createServer(+process.env.PORT || 5000, options),

  getBandNames = function getBandNames(callback) {
    client.hvals('bands', function(err, results) {
      if (err) { server.log(['hvals', 'error'], err); }
      callback(results);
    });
  },

  links = function links(request, reply) {
    var linksViewData = {},
      response = reply.view('index', linksViewData).hold();

    getBandNames(function(results) {
      linksViewData.bandId = bandId || 0;
      linksViewData.bandNames = bandNames = results;
      response.send();
    });
  },

  bandInfo = function bandInfo(reply, id) {
    var arrId = id - 1,
      viewDetails = {};
      viewDetails.bandId = bandId = id;
      viewDetails.bandNames = bandNames;

    // Could use multi
    client.hget('band:' + arrId, 'year_formed', function(err, results) { // get year formed
      if (err) { server.log(['hget', 'error'], err); }
      viewDetails.bandYear = results;

      client.hvals('members:' + arrId, function(err, results) { // get band members
        if (err) { server.log(['hget', 'error'], err); }
        viewDetails.bandMembers = results;

        if (bandNames.length) {
          reply.view('band', viewDetails);
        } else {
          getBandNames(function(results) {
            viewDetails.bandNames = bandNames = results;
            reply.view('band', viewDetails);
          });
        }
      });
    });
  },

  bandDetails = function bandHandler(request, reply) {
    var id = request.params.id;
    bandInfo(reply, id);
  },

  updateBand = function updateBand(request, reply) {
    var id = request.params.id,
      arrId = id - 1,
      content = request.payload.content.trim();

    if (request.payload.memberId) { // either input a member, input band name, delete band or input year
      client.hset('members:' + arrId, request.payload.memberId, content, redis.print);
    } else if (request.payload.isBandName) {
      client.hset('band:' + arrId, 'name', content, redis.print);
      client.hset('bands', arrId, content, redis.print);
      bandNames = []; // grab band names on next display
    } else if (request.payload.toDelete) {
      client.del('band:' + arrId, redis.print);
      client.del('members:' + arrId, redis.print);
      client.hdel('bands', arrId, redis.print);
      bandNames = []; // grab band names on next display
    } else {
      client.hset('band:' + arrId, 'year_formed', content, redis.print);
    }
    bandInfo(reply, id);
  },

  createBand = function createBand(request, reply) {
    var arrId = bandNames.length,
      band = request.payload;
      members = band.members.split('\n');

    client.hmset('band:' + arrId, 'name', band.name, 'year_formed', band.year_formed, redis.print);
    client.hset('bands', arrId, band.name, redis.print);
    bandNames = []; // grab band names on next display
    membersHash(arrId, members);
    bandInfo(reply, arrId + 1); // redirect maybe better?
  },

  membersHash = function membersHash(i, members, nx) {
    nx = nx ? nx : ''; // whether to override or not

    members.forEach(function(member, j) {
      client['hset' + nx]('members:' + i, j, member.name || member, redis.print);
    });
  };
/*   End of variable declaration   */

client.on('error', function(err) {
  console.log('Error ' + err);
});

bands.forEach(function(band, i) {
  server.log(['json', 'redis'], 'Loading default json (if it doesn\'t exist) into database...');
  client.hsetnx('bands', i, band.name, redis.print); // Could create multi/exec, apparently pipeline is automatic in node.js
  client.exists('band:' + i, function(err, results) {
    if (err) { server.log(['hget', 'error'], err); }
    if (!results) {
      client.hmset('band:' + i, 'name', band.name, 'year_formed', band.year_formed, redis.print);
    }
  });
  membersHash(i, band.members, 'nx');
});

/* ************* hapi ************* */
server.route([
  { path: '/', method: 'GET', handler: links },
  { path: '/bands/{id}', method: 'GET', handler: bandDetails },
  { path: '/bands/{id}/edit', method: 'POST', handler: updateBand },
  { path: '/create', method: 'POST', handler: createBand }
]);

server.on('log', function(event, tags) {
  if (tags.error) {
    console.log('Server error: ' + (event.data || 'unspecified'));
  } else {
    console.log(tags, event.data);
  }
});

server.on('internalError', function(request, err) {
    console.log('Error response (500) sent for request: ' + request.id + ' because: ' + err.message);
});

server.start(function() {
  console.log('Hapi version:', Hapi.version, ' Started:', server.info.uri);
});
