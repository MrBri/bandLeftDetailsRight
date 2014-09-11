var Hapi = require('hapi'),
  bands = require('./bands.json'),
  util = require('util'),
  redis = require('redis'),
  client = redis.createClient(),
  bandNames = [],

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

  links = function handler(request, reply) {
    reply.view('index', { bandNames: bandNames, bandId: 1 });
  },
  bandInfo = function bandInfo(request, reply, id) {
    return reply.view('band', {
      bandId: id,
      bandYear: bands[id - 1].year_formed,
      bandMembers: bands[id - 1].members,
      bandNames: bandNames
    });
  },
  bandDetails = function bandHandler(request, reply) {
    var id = request.params.id;
    bandInfo(request, reply, id);
  },
  updateBand = function updateBand(request, reply) {
    var id = request.params.id,
      content = request.payload.content.trim();

    if (request.payload.memberId) {
      bands[id - 1].members[request.payload.memberId].name = content;
    } else {
      bands[id - 1].year_formed = content;
    }
    bandInfo(request, reply, id);
  },

  membersSortedSet = function membersSortedSet(i, members) {
    members.forEach(function(member, j) {
      client.zadd('members:' + i, j, member.name, redis.print);
    });
  };
/* End of variable declaration     */

/* ******** redis events ********* */
client.on('error', function(err) {
  console.log('Error ' + err);
});

// monitor causing redis to crash in my situation

// client.monitor(function(err, res) {
//     console.log("Entering monitoring mode.");
// });

// client.on("monitor", function(time, args) {
//     console.log(time + ": " + args);
// });

bands.forEach(function(band, i) {
  bandNames.push(band.name);

  // Adding json to database
  client.hmset('band:' + i, 'name', band.name, 'year_formed', band.year_formed, redis.print);
  membersSortedSet(i, band.members);
});

/* ************* hapi ************* */
server.route([
  { path: '/', method: 'GET', handler: links },
  { path: '/bands/{id}', method: 'GET', handler: bandDetails },
  { path: '/bands/{id}/edit', method: 'POST', handler: updateBand }
]);

server.on('log', function(event, tags) {
  if (tags.error) {
    console.log('Server error: ' + (event.data || 'unspecified'));
  }
});

server.on('internalError', function(request, err) {
    console.log('Error response (500) sent for request: ' + request.id + ' because: ' + err.message);
});

server.start(function() {
  console.log('Hapi version:', Hapi.version, ' Started:', server.info.uri);
  client.zrange('members:3', 0, -1, function(err, results) {
    console.log('members:3', util.inspect(results));
  });
});
