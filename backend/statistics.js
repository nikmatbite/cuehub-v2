var StatisticsService = {

  // ===========================================================================
  // COMPUTE & SAVE — Entry point utama
  // Dipanggil saat session di-finish.
  // 1. Hitung session_statistics untuk session ini
  // 2. Update lifetime player_statistics untuk setiap player yang ikut
  // ===========================================================================
  compute: function (payload) {
    requireFields(payload, ['session_id']);

    var sessionId = payload.session_id;

    // Validasi session ada
    var sSheet  = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sSheet, 'session_id', sessionId);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');

    // Kumpulkan semua data yang dibutuhkan
    var data = StatisticsService._collectSessionData(sessionId);

    // Hitung session statistics
    var sessionStats = StatisticsService._computeSessionStats(sessionId, data);

    // Simpan / update session_statistics
    StatisticsService._saveSessionStats(sessionStats);

    // Update lifetime player_statistics untuk setiap player
    data.playerIds.forEach(function (playerId) {
      StatisticsService._updatePlayerStats(playerId, sessionId, data);
    });

    logAction(payload._user_id, 'STATISTICS_COMPUTE', sessionId);

    return {
      session_statistics: sessionStats,
      players_updated:    data.playerIds.length
    };
  },

  // ===========================================================================
  // GET SESSION STATISTICS
  // ===========================================================================
  getSessionStats: function (payload) {
    requireFields(payload, ['session_id']);

    var ssSheet = getSheet('db', SHEET_SESSION_STATISTICS);
    var stats   = findRowByField(ssSheet, 'session_id', payload.session_id);
    if (!stats) throw new ApiError('SESSION_STATS_NOT_FOUND');

    return StatisticsService._sanitizeSessionStats(stats);
  },

  // ===========================================================================
  // GET PLAYER STATISTICS (lifetime)
  // ===========================================================================
  getPlayerStats: function (payload) {
    requireFields(payload, ['player_id']);

    var psSheet = getSheet('db', SHEET_PLAYER_STATISTICS);
    var stats   = findRowByField(psSheet, 'player_id', payload.player_id);
    if (!stats) throw new ApiError('PLAYER_STATS_NOT_FOUND');

    return StatisticsService._sanitizePlayerStats(stats);
  },

  // Ambil semua player statistics (untuk leaderboard)
  getAllPlayerStats: function () {
    var psSheet = getSheet('db', SHEET_PLAYER_STATISTICS);
    var rows    = sheetToObjects(psSheet);
    return rows
      .map(function (r) { return StatisticsService._sanitizePlayerStats(r); })
      .sort(function (a, b) { return b.win - a.win; }); // default sort: win terbanyak
  },

  // ===========================================================================
  // PRIVATE — COLLECT SESSION DATA
  // Kumpulkan semua raw data yang dibutuhkan untuk kalkulasi.
  // Satu kali baca sheet, dipakai berulang — hindari banyak getSheet calls.
  // ===========================================================================
  _collectSessionData: function (sessionId) {
    // Semua session_games dalam session ini
    var sgSheet      = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGames = findAllByField(sgSheet, 'session_id', sessionId);
    var sgIds        = sessionGames.map(function (sg) { return sg.session_game_id; });

    // Semua match dalam session ini
    var mmSheet  = getSheet('db', SHEET_MATCH_MASTER);
    var allMatch = sheetToObjects(mmSheet);
    var matches  = allMatch.filter(function (m) {
      return sgIds.indexOf(m.session_game_id) !== -1 &&
             m.status === MATCH_STATUS.FINISHED;
    });
    var matchIds = matches.map(function (m) { return m.match_id; });

    // Semua match_players dalam session ini
    var mpSheet     = getSheet('db', SHEET_MATCH_PLAYERS);
    var allMp       = sheetToObjects(mpSheet);
    var matchPlayers = allMp.filter(function (mp) {
      return matchIds.indexOf(mp.match_id) !== -1;
    });

    // Semua score_log dalam session ini
    var slSheet  = getSheet('db', SHEET_SCORE_LOG);
    var allScore = sheetToObjects(slSheet);
    var scoreLogs = allScore.filter(function (s) {
      return matchIds.indexOf(s.match_id) !== -1;
    });

    // Semua player yang ikut session ini
    var spSheet        = getSheet('db', SHEET_SESSION_PLAYERS);
    var sessionPlayers = findAllByField(spSheet, 'session_id', sessionId);
    var playerIds      = sessionPlayers.map(function (sp) { return sp.player_id; });

    // Game master untuk resolving game mode
    var gSheet   = getSheet('db', SHEET_GAME_MASTER);
    var allGames = sheetToObjects(gSheet);

    return {
      sessionGames:   sessionGames,
      sgIds:          sgIds,
      matches:        matches,
      matchIds:       matchIds,
      matchPlayers:   matchPlayers,
      scoreLogs:      scoreLogs,
      playerIds:      playerIds,
      allGames:       allGames
    };
  },

  // ===========================================================================
  // PRIVATE — COMPUTE SESSION STATISTICS
  // ===========================================================================
  _computeSessionStats: function (sessionId, data) {
    var totalMatch  = data.matches.length;
    var totalGame   = data.sessionGames.length;
    var totalPlayer = data.playerIds.length;

    // Total durasi session (dari session_master start_time → end_time)
    var sSheet      = getSheet('db', SHEET_SESSION_MASTER);
    var session     = findRowByField(sSheet, 'session_id', sessionId);
    var totalDuration = StatisticsService._calcDuration(
      session.start_time, session.end_time
    );

    // MVP: player dengan jumlah menang terbanyak dalam session ini
    var winCount = StatisticsService._countWinsPerPlayer(data.matches, data.matchPlayers);
    var mvp      = StatisticsService._topByValue(winCount);

    // Champion: player dengan total score tertinggi dari SCORE_LOG dalam session ini
    var scoreTotal = StatisticsService._sumScorePerPlayer(data.scoreLogs);
    var champion   = StatisticsService._topByValue(scoreTotal);

    return {
      session_id:     sessionId,
      total_match:    totalMatch,
      total_game:     totalGame,
      total_player:   totalPlayer,
      total_duration: totalDuration,
      mvp:            mvp,
      champion:       champion,
      updated_at:     nowISOString()
    };
  },

  // ===========================================================================
  // PRIVATE — SAVE SESSION STATISTICS
  // Upsert: update jika sudah ada, insert jika belum.
  // ===========================================================================
  _saveSessionStats: function (stats) {
    var ssSheet  = getSheet('db', SHEET_SESSION_STATISTICS);
    var existing = findRowByField(ssSheet, 'session_id', stats.session_id);

    withLock(function () {
      if (existing) {
        updateRowObject(ssSheet, existing._rowIndex, stats);
      } else {
        appendRowObject(ssSheet, stats);
      }
    });
  },

  // ===========================================================================
  // PRIVATE — UPDATE LIFETIME PLAYER STATISTICS
  // Untuk setiap player: ambil record lama, tambahkan hasil session ini,
  // simpan kembali. Upsert: jika belum ada record, buat baru.
  // ===========================================================================
  _updatePlayerStats: function (playerId, sessionId, data) {
    var psSheet  = getSheet('db', SHEET_PLAYER_STATISTICS);
    var existing = findRowByField(psSheet, 'player_id', playerId);

    // Hitung kontribusi player ini dari session yang baru selesai
    var contribution = StatisticsService._calcPlayerContribution(
      playerId, sessionId, data
    );

    if (existing) {
      // Akumulasi ke lifetime stats yang sudah ada
      var updated = {
        session:           (parseInt(existing.session,           10) || 0) + 1,
        match:             (parseInt(existing.match,             10) || 0) + contribution.match,
        win:               (parseInt(existing.win,               10) || 0) + contribution.win,
        lose:              (parseInt(existing.lose,              10) || 0) + contribution.lose,
        king_title:        (parseInt(existing.king_title,        10) || 0) + contribution.king_title,
        tournament_title:  (parseInt(existing.tournament_title,  10) || 0) + contribution.tournament_title,
        singapore_win:     (parseInt(existing.singapore_win,     10) || 0) + contribution.singapore_win,
        team_win:          (parseInt(existing.team_win,          10) || 0) + contribution.team_win,
        last_update:       nowISOString()
      };

      // Win rate = total win / total match (lifetime)
      var totalWin   = updated.win;
      var totalMatch = updated.match;
      updated.win_rate = totalMatch > 0
        ? Math.round((totalWin / totalMatch) * 10000) / 100 // 2 desimal, misal 66.67
        : 0;

      // Longest streak: ambil maks antara yang lama dan streak session ini
      var oldStreak = parseInt(existing.longest_streak, 10) || 0;
      updated.longest_streak = Math.max(oldStreak, contribution.longest_streak);

      withLock(function () { updateRowObject(psSheet, existing._rowIndex, updated); });

    } else {
      // Buat record baru
      var newRecord = {
        player_id:        playerId,
        session:          1,
        match:            contribution.match,
        win:              contribution.win,
        lose:             contribution.lose,
        win_rate:         contribution.match > 0
                            ? Math.round((contribution.win / contribution.match) * 10000) / 100
                            : 0,
        king_title:       contribution.king_title,
        tournament_title: contribution.tournament_title,
        singapore_win:    contribution.singapore_win,
        team_win:         contribution.team_win,
        longest_streak:   contribution.longest_streak,
        last_update:      nowISOString()
      };

      withLock(function () { appendRowObject(psSheet, newRecord); });
    }
  },

  // ===========================================================================
  // PRIVATE — CALC PLAYER CONTRIBUTION (dari 1 session)
  // Hitung semua metric untuk 1 player dalam 1 session.
  // ===========================================================================
  _calcPlayerContribution: function (playerId, sessionId, data) {
    // Match yang diikuti player ini
    var myMatchIds = data.matchPlayers
      .filter(function (mp) { return mp.player_id === playerId; })
      .map(function (mp) { return mp.match_id; });

    var myMatches = data.matches.filter(function (m) {
      return myMatchIds.indexOf(m.match_id) !== -1;
    });

    var totalMatch = myMatches.length;
    var totalWin   = 0;
    var totalLose  = 0;
    var kingTitle  = 0;
    var tournTitle = 0;
    var sgWin      = 0;
    var teamWin    = 0;

    myMatches.forEach(function (m) {
      var sg   = data.sessionGames.filter(function (g) {
        return g.session_game_id === m.session_game_id;
      })[0];
      var game = sg ? data.allGames.filter(function (g) {
        return g.game_id === sg.game_id;
      })[0] : null;
      var mode = game
        ? (game.game_name || '').toLowerCase().replace(/ /g, '_')
        : GAME_MODE.CUSTOM;

      // Cek apakah player ini menang di match ini
      var mp = data.matchPlayers.filter(function (p) {
        return p.match_id === m.match_id && p.player_id === playerId;
      })[0];

      var isWin = false;

      if (mode === GAME_MODE.TEAM_BATTLE) {
        // Menang jika tim player == winner_team
        isWin = mp && m.winner_team && mp.team === m.winner_team;
        if (isWin) teamWin++;
      } else if (mode === GAME_MODE.SINGAPORE) {
        // Menang jika ranking 1
        isWin = mp && parseInt(mp.ranking, 10) === 1;
        if (isWin) sgWin++;
      } else if (mode === GAME_MODE.KING_OF_TABLE) {
        isWin = m.winner_player === playerId;
        if (isWin) kingTitle++;
      } else if (mode === GAME_MODE.TOURNAMENT) {
        isWin = m.winner_player === playerId;
        // tournament_title hanya untuk pemenang match final (round = 'F')
        if (isWin && (m.round === 'F' || m.round === 'final')) tournTitle++;
      } else {
        // Duel, Round Robin, Custom
        isWin = m.winner_player === playerId;
      }

      if (isWin) totalWin++;
      else totalLose++;
    });

    // Longest winning streak dalam session ini
    var longestStreak = StatisticsService._calcLongestStreak(
      playerId, myMatches, data.matchPlayers
    );

    return {
      match:            totalMatch,
      win:              totalWin,
      lose:             totalLose,
      king_title:       kingTitle,
      tournament_title: tournTitle,
      singapore_win:    sgWin,
      team_win:         teamWin,
      longest_streak:   longestStreak
    };
  },

  // ===========================================================================
  // PRIVATE — LONGEST WINNING STREAK dalam 1 session
  // Urutkan match berdasarkan end_time, hitung streak berurutan.
  // ===========================================================================
  _calcLongestStreak: function (playerId, myMatches, matchPlayers) {
    // Urutkan berdasarkan end_time
    var sorted = myMatches.slice().sort(function (a, b) {
      return a.end_time < b.end_time ? -1 : 1;
    });

    var longest = 0;
    var current = 0;

    sorted.forEach(function (m) {
      var mp = matchPlayers.filter(function (p) {
        return p.match_id === m.match_id && p.player_id === playerId;
      })[0];

      var isWin = false;
      if (m.winner_player === playerId) {
        isWin = true;
      } else if (m.winner_team && mp && mp.team === m.winner_team) {
        isWin = true;
      } else if (mp && parseInt(mp.ranking, 10) === 1) {
        isWin = true;
      }

      if (isWin) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    });

    return longest;
  },

  // ===========================================================================
  // PRIVATE — HELPERS
  // ===========================================================================

  // Hitung jumlah menang per player dari matches + match_players
  _countWinsPerPlayer: function (matches, matchPlayers) {
    var counts = {};

    matches.forEach(function (m) {
      if (m.winner_player) {
        counts[m.winner_player] = (counts[m.winner_player] || 0) + 1;
      } else if (m.winner_team) {
        // Team Battle: semua anggota tim pemenang dapat kredit menang
        matchPlayers
          .filter(function (mp) {
            return mp.match_id === m.match_id && mp.team === m.winner_team;
          })
          .forEach(function (mp) {
            counts[mp.player_id] = (counts[mp.player_id] || 0) + 1;
          });
      }
    });

    return counts;
  },

  // Jumlahkan score per player dari score_log
  _sumScorePerPlayer: function (scoreLogs) {
    var totals = {};
    scoreLogs.forEach(function (s) {
      totals[s.player_id] = (totals[s.player_id] || 0) + (parseFloat(s.score) || 0);
    });
    return totals;
  },

  // Ambil player_id dengan nilai tertinggi dari map { player_id: value }
  // Return player_id atau '' jika map kosong
  _topByValue: function (map) {
    var keys = Object.keys(map);
    if (!keys.length) return '';
    return keys.reduce(function (top, pid) {
      return map[pid] > map[top] ? pid : top;
    });
  },

  // Hitung durasi dalam menit dari 2 ISO string
  _calcDuration: function (startTime, endTime) {
    if (!startTime || !endTime) return 0;
    var diff = new Date(endTime) - new Date(startTime);
    return Math.round(diff / 60000); // dalam menit
  },

  // ===========================================================================
  // PRIVATE — SANITIZERS
  // ===========================================================================
  _sanitizeSessionStats: function (r) {
    return {
      session_id:     r.session_id,
      total_match:    parseInt(r.total_match,  10) || 0,
      total_game:     parseInt(r.total_game,   10) || 0,
      total_player:   parseInt(r.total_player, 10) || 0,
      total_duration: parseInt(r.total_duration, 10) || 0,
      mvp:            r.mvp,
      champion:       r.champion,
      updated_at:     r.updated_at
    };
  },

  _sanitizePlayerStats: function (r) {
    return {
      player_id:        r.player_id,
      session:          parseInt(r.session,          10) || 0,
      match:            parseInt(r.match,            10) || 0,
      win:              parseInt(r.win,              10) || 0,
      lose:             parseInt(r.lose,             10) || 0,
      win_rate:         parseFloat(r.win_rate)           || 0,
      king_title:       parseInt(r.king_title,       10) || 0,
      tournament_title: parseInt(r.tournament_title, 10) || 0,
      singapore_win:    parseInt(r.singapore_win,    10) || 0,
      team_win:         parseInt(r.team_win,         10) || 0,
      longest_streak:   parseInt(r.longest_streak,   10) || 0,
      last_update:      r.last_update
    };
  }
};