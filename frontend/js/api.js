var GAS_URL = 'https://script.google.com/macros/s/AKfycbyv1l9Im-0zjssukHxXdRBMIQvJnyNFAIMMgzm8OJI_ZXGbtiQO-rYOF8ixmyGMX_CS/exec';

function gasRequest(action, payload) {
  var body = JSON.stringify({ action: action, payload: payload || {} });
  console.log("ACTION:", action);
  console.log("PAYLOAD:", payload);
  return fetch(GAS_URL, {
    method:  'POST',
    body:    body,
    headers: { 'Content-Type': 'text/plain' }
  })
  .then(function (res) {
    console.log("STATUS:", res.status);
    if (!res.ok) throw new Error('NETWORK_ERROR');
    return res.json();
  })
  .then(function (json) {
    console.log("RESPONSE:", json);
    if (!json.success) {
      var code = (json.error && json.error.code) ? json.error.code : 'INTERNAL_ERROR';
      throw new Error(code);
    }
    return json.data;
  });
}

function withUser(payload) {
  var user = getSession();
  if (user && user.user_id) payload._user_id = user.user_id;
  return payload;
}

var Api = {

  auth: {
    login:    function (email, password) {
      return gasRequest('auth.login', { email: email, password: password });
    },
    register: function (data) {
      return gasRequest('auth.register', data);
    }
  },

  player: {
    getAll:  function ()     { return gasRequest('player.getAll',  withUser({})); },
    getById: function (id)   { return gasRequest('player.getById', withUser({ player_id: id })); },
    create:  function (data) { return gasRequest('player.create',  withUser(data)); },
    update:  function (data) { return gasRequest('player.update',  withUser(data)); },
    delete:  function (id)   { return gasRequest('player.delete',  withUser({ player_id: id })); }
  },

  session: {
    create:       function (data)               { return gasRequest('session.create',       withUser(data)); },
    getAll:       function (status)             { return gasRequest('session.getAll',        withUser(status ? { status: status } : {})); },
    getById:      function (id)                 { return gasRequest('session.getById',       withUser({ session_id: id })); },
    update:       function (data)               { return gasRequest('session.update',        withUser(data)); },
    updateStatus: function (id, status)         { return gasRequest('session.updateStatus',  withUser({ session_id: id, status: status })); },
    addPlayer:    function (sessionId, playerId){ return gasRequest('session.addPlayer',     withUser({ session_id: sessionId, player_id: playerId })); },
    removePlayer: function (sessionId, playerId){ return gasRequest('session.removePlayer',  withUser({ session_id: sessionId, player_id: playerId })); },
    getPlayers:   function (id)                 { return gasRequest('session.getPlayers',    withUser({ session_id: id })); }
  },

  game: {
    getAll:  function ()   { return gasRequest('game.getAll',  withUser({})); },
    getById: function (id) { return gasRequest('game.getById', withUser({ game_id: id })); }
  },

  sessionGame: {
    create:       function (data)       { return gasRequest('sessionGame.create',       withUser(data)); },
    getAll:       function (sessionId)  { return gasRequest('sessionGame.getAll',       withUser({ session_id: sessionId })); },
    getById:      function (id)         { return gasRequest('sessionGame.getById',      withUser({ session_game_id: id })); },
    update:       function (data)       { return gasRequest('sessionGame.update',       withUser(data)); },
    updateStatus: function (id, status) { return gasRequest('sessionGame.updateStatus', withUser({ session_game_id: id, status: status })); }
  },

  match: {
    create:           function (data)               { return gasRequest('match.create',          withUser(data)); },
    getAll:           function (sessionGameId)       { return gasRequest('match.getAll',          withUser({ session_game_id: sessionGameId })); },
    getById:          function (id)                 { return gasRequest('match.getById',          withUser({ match_id: id })); },
    start:            function (id)                 { return gasRequest('match.start',            withUser({ match_id: id })); },
    finish:           function (data)               { return gasRequest('match.finish',           withUser(data)); },
    cancel:           function (id)                 { return gasRequest('match.cancel',           withUser({ match_id: id })); },
    addScore:         function (matchId, pid, score){ return gasRequest('match.addScore',         withUser({ match_id: matchId, player_id: pid, score: score })); },
    getScores:        function (id)                 { return gasRequest('match.getScores',        withUser({ match_id: id })); },
    generateRotation: function (sgId, playerIds)    { return gasRequest('match.generateRotation', withUser({ session_game_id: sgId, player_ids: playerIds })); }
  },

  queue: {
    add:     function (sgId, pid)          { return gasRequest('match.queueAdd',     withUser({ session_game_id: sgId, player_id: pid })); },
    get:     function (sgId)               { return gasRequest('match.queueGet',     withUser({ session_game_id: sgId })); },
    remove:  function (sgId, pid)          { return gasRequest('match.queueRemove',  withUser({ session_game_id: sgId, player_id: pid })); },
    reorder: function (sgId, orderedPids)  { return gasRequest('match.queueReorder', withUser({ session_game_id: sgId, ordered_player_ids: orderedPids })); }
  },

  statistics: {
    compute:    function (sessionId) { return gasRequest('statistics.compute',    withUser({ session_id: sessionId })); },
    getSession: function (sessionId) { return gasRequest('statistics.getSession', withUser({ session_id: sessionId })); },
    getPlayer:  function (playerId)  { return gasRequest('statistics.getPlayer',  withUser({ player_id: playerId })); },
    getAllPlayers: function ()        { return gasRequest('statistics.getAllPlayers', withUser({})); }
  }
};