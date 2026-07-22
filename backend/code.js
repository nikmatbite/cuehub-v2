var ROUTES = {
  'auth.register':              function (p) { return AuthService.register(p); },
  'auth.login':                 function (p) { return AuthService.login(p); },

  'player.create':              function (p) { return PlayerService.create(p); },
  'player.getAll':              function (p) { return PlayerService.getAll(); },
  'player.getById':             function (p) { return PlayerService.getById(p); },
  'player.update':              function (p) { return PlayerService.update(p); },
  'player.delete':              function (p) { return PlayerService.delete(p); },

  'session.create':             function (p) { return SessionService.create(p); },
  'session.getAll':             function (p) { return SessionService.getAll(p); },
  'session.getById':            function (p) { return SessionService.getById(p); },
  'session.update':             function (p) { return SessionService.update(p); },
  'session.updateStatus':       function (p) { return SessionService.updateStatus(p); },
  'session.addPlayer':          function (p) { return SessionService.addPlayer(p); },
  'session.removePlayer':       function (p) { return SessionService.removePlayer(p); },
  'session.getPlayers':         function (p) { return SessionService.getPlayers(p); },

  'game.getAll':                function (p) { return GameService.getAll(); },
  'game.getById':               function (p) { return GameService.getById(p); },

  'sessionGame.create':         function (p) { return GameService.sessionCreate(p); },
  'sessionGame.getAll':         function (p) { return GameService.sessionGetAll(p); },
  'sessionGame.getById':        function (p) { return GameService.sessionGetById(p); },
  'sessionGame.update':         function (p) { return GameService.sessionUpdate(p); },
  'sessionGame.updateStatus':   function (p) { return GameService.sessionUpdateStatus(p); },

  'match.create':           function (p) { return MatchService.create(p); },
  'match.getAll':           function (p) { return MatchService.getAll(p); },
  'match.getById':          function (p) { return MatchService.getById(p); },
  'match.start':            function (p) { return MatchService.start(p); },
  'match.finish':           function (p) { return MatchService.finish(p); },
  'match.cancel':           function (p) { return MatchService.cancel(p); },

  'match.addScore':         function (p) { return MatchService.addScore(p); },
  'match.getScores':        function (p) { return MatchService.getScores(p); },

  'queue.add':              function (p) { return MatchService.queueAdd(p); },
  'queue.get':              function (p) { return MatchService.queueGet(p); },
  'queue.remove':           function (p) { return MatchService.queueRemove(p); },
  'queue.reorder':          function (p) { return MatchService.queueReorder(p); },

  'match.generateRotation': function (p) { return MatchService.generateRotation(p); },

  'statistics.compute':        function (p) { return StatisticsService.compute(p); },
  'statistics.getSession':     function (p) { return StatisticsService.getSessionStats(p); },
  'statistics.getPlayer':      function (p) { return StatisticsService.getPlayerStats(p); },
  'statistics.getAllPlayers':  function (p) { return StatisticsService.getAllPlayerStats(); },

  'match.queueAdd':          function (p) { return MatchService.queueAdd(p); },
  'match.queueGet':          function (p) { return MatchService.queueGet(p); },
  'match.queueRemove':       function (p) { return MatchService.queueRemove(p); },
  'match.queueReorder':      function (p) { return MatchService.queueReorder(p); },
  'match.create':            function (p) { return MatchService.create(p); },
  'match.getAll':            function (p) { return MatchService.getAll(p); },
  'match.getById':           function (p) { return MatchService.getById(p); },
  'match.start':             function (p) { return MatchService.start(p); },
  'match.finish':            function (p) { return MatchService.finish(p); },
  'match.cancel':            function (p) { return MatchService.cancel(p); },
  'match.addScore':          function (p) { return MatchService.addScore(p); },
  'match.getScores':         function (p) { return MatchService.getScores(p); },
  'match.generateRotation':  function (p) { return MatchService.generateRotation(p); },
  'statistics.compute':      function (p) { return StatisticsService.compute(p); },
  'statistics.getSession':   function (p) { return StatisticsService.getSessionStats(p); },
  'statistics.getPlayer':    function (p) { return StatisticsService.getPlayerStats(p); },
  'statistics.getAllPlayers': function (p) { return StatisticsService.getAllPlayerStats(); }
};

function doGet(e) {
  return route(e);
}

function doPost(e) {
  return route(e);
}

function route(e) {
  var responseObj;
  try {
    var request = parseRequest(e);
    var action  = request.action;
    var payload = request.payload || {};

    if (!action) throw new ApiError('MISSING_ACTION');

    var handler = ROUTES[action];
    if (!handler) throw new ApiError('UNKNOWN_ACTION');

    responseObj = successResponse(handler(payload));
  } catch (err) {
    responseObj = errorResponse(err);
  }
  return buildOutput(responseObj);
}