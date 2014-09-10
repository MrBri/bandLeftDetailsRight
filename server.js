var Hapi = require('hapi'),
  bands = require('./bands.json'),
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
  bandDetails = function bandHandler(request, reply) {
    var id = request.params.id - 1;
    reply.view('band', {
      bandId: id,
      bandYear: bands[id].year_formed,
      bandMembers: bands[id].members,
      bandNames: bandNames
    });
  };

bands.forEach(function(band) {
  bandNames.push(band.name);
});

server.route([
  { path: '/', method: 'GET', handler: links },
  { path: '/bands/{id}', method: 'GET', handler: bandDetails }
]);

server.start(function() {
  console.log('Hapi version:', Hapi.version, ' Started:', server.info.uri);
});

server.on('log', function(event, tags) {
  if (tags.error) {
    console.log('Server error: ' + (event.data || 'unspecified'));
  }
});

server.on('internalError', function(request, err) {
    console.log('Error response (500) sent for request: ' + request.id + ' because: ' + err.message);
});
