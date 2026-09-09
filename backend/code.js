// =============================================================
// CueHub v3 — code.gs
// Entry point GAS Web App: doPost router
// =============================================================

// --- Route Map ---
// Format: 'resource.action': handlerFunction
var ROUTES = {
  // Auth
  'auth.login'   : authLogin,
  'auth.logout'  : authLogout,
  'auth.me'      : authMe,
  'auth.register': authRegister,

  // Players
  'player.getAll'   : playerGetAll,
  'player.getById'  : playerGetById,
  'player.create'   : playerCreate,
  'player.update'   : playerUpdate,
  'player.delete'   : playerDelete,

  // Sessions
  'session.create'  : sessionCreate,
  'session.getAll'  : sessionGetAll,
  'session.getById' : sessionGetById,
  'session.finish'  : sessionFinish,

  // Segments (satu blok permainan dalam sesi)
  'segment.start'   : segmentStart,    // mulai segment baru (generate siklus)
  'segment.finish'  : segmentFinish,   // End Game
  'segment.shuffle' : segmentShuffle,  // Acak ulang siklus, mode+player sama
  'segment.getActive': segmentGetActive,

  // Matches
  'match.submitWinner': matchSubmitWinner,
  'match.getBySegment': matchGetBySegment,

  // Statistics
  'stats.getPlayer'  : statsGetPlayer,
  'stats.getAllPlayers': statsGetAllPlayers,
  'stats.getSession' : statsGetSession
};

// --- doGet: untuk health check / browser test ---
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'CueHub v3 API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- doPost: semua request masuk sini ---
function doPost(e) {
  try {
    var body = parseJson(e.postData.contents);
    if (!body) return fail(ERR.MISSING_PARAMS);

    var action = body.action;
    if (!action) return fail(ERR.INVALID_ACTION);

    var handler = ROUTES[action];
    if (!handler) return fail(ERR.INVALID_ACTION);

    // Endpoint public (tidak butuh token)
    var publicRoutes = ['auth.login', 'auth.register'];
    var isPublic = publicRoutes.indexOf(action) !== -1;

    var user = null;
    if (!isPublic) {
      user = validateToken(body.token);
      if (!user) return fail(ERR.UNAUTHORIZED);
    }

    // Panggil handler dengan params dan user
    return handler(body.params || {}, user);

  } catch(err) {
    logAction('SYSTEM', 'SERVER_ERROR', err.message);
    return fail(ERR.SERVER_ERROR);
  }
}
