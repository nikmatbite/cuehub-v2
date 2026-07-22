var MatchService = {

  // ===========================================================================
  // CREATE MATCH
  // Payload wajib  : session_game_id
  // Payload opsional:
  //   players      : array player_id (semua mode kecuali King of Table / Queue-based)
  //   teams        : { A: [player_id, ...], B: [player_id, ...] }  → Team Battle
  //   match_no     : override urutan tampilan (default: auto-increment)
  //   round        : string label ronde (misal '1', 'QF', 'SF', 'F')
  // ===========================================================================
  create: function (payload) {
    requireFields(payload, ['session_game_id']);

    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', payload.session_game_id);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');
    if (sessionGame.status === SESSION_GAME_STATUS.FINISHED) {
      throw new ApiError('SESSION_GAME_ALREADY_FINISHED');
    }

    var config = MatchService._parseConfig(sessionGame.config);
    var mode   = MatchService._resolveMode(sessionGame.game_id);

    // auto match_no: jumlah match yang sudah ada di session_game ini + 1
    var mmSheet  = getSheet('db', SHEET_MATCH_MASTER);
    var existing = findAllByField(mmSheet, 'session_game_id', payload.session_game_id);
    var matchNo  = payload.match_no || (existing.length + 1);

    var matchId = generateUUID();
    var now     = nowISOString();

    var match = {
      match_id:        matchId,
      session_game_id: payload.session_game_id,
      next_match_id:   payload.next_match_id || '',
      match_no:        matchNo,
      round:           payload.round || '1',
      winner_player:   '',
      winner_team:     '',
      status:          MATCH_STATUS.SCHEDULED,
      start_time:      '',
      end_time:        '',
      updated_by:      payload._user_id || '',
      updated_at:      now
    };

    withLock(function () { appendRowObject(mmSheet, match); });

    // Daftarkan pemain ke MATCH_PLAYERS
    if (mode === GAME_MODE.TEAM_BATTLE) {
      MatchService._addTeamPlayers(matchId, payload.teams || {});
    } else if (mode === GAME_MODE.KING_OF_TABLE) {
      // King of Table: ambil dari antrian (2 pemain teratas PLAYING/WAITING)
      MatchService._addKingPlayers(matchId, payload.session_game_id, payload.players || []);
    } else {
      // Duel, Singapore, Tournament, Round Robin, Custom
      MatchService._addSoloPlayers(matchId, payload.players || []);
    }

    logAction(payload._user_id, 'MATCH_CREATE', matchId);
    return MatchService._buildMatchResponse(match, matchId);
  },

  // ===========================================================================
  // GET ALL MATCHES (untuk 1 session_game)
  // ===========================================================================
  getAll: function (payload) {
    requireFields(payload, ['session_game_id']);

    var mmSheet  = getSheet('db', SHEET_MATCH_MASTER);
    var matches  = findAllByField(mmSheet, 'session_game_id', payload.session_game_id);
    matches.sort(function (a, b) {
      return parseInt(a.match_no, 10) - parseInt(b.match_no, 10);
    });

    return matches.map(function (m) {
      return MatchService._buildMatchResponse(m, m.match_id);
    });
  },

  // ===========================================================================
  // GET BY ID
  // ===========================================================================
  getById: function (payload) {
    requireFields(payload, ['match_id']);

    var mmSheet = getSheet('db', SHEET_MATCH_MASTER);
    var match   = findRowByField(mmSheet, 'match_id', payload.match_id);
    if (!match) throw new ApiError('MATCH_NOT_FOUND');

    return MatchService._buildMatchResponse(match, match.match_id);
  },

  // ===========================================================================
  // START MATCH → status: ongoing
  // ===========================================================================
  start: function (payload) {
    requireFields(payload, ['match_id']);

    var mmSheet = getSheet('db', SHEET_MATCH_MASTER);
    var match   = findRowByField(mmSheet, 'match_id', payload.match_id);
    if (!match) throw new ApiError('MATCH_NOT_FOUND');
    if (match.status !== MATCH_STATUS.SCHEDULED) {
      throw new ApiError('MATCH_INVALID_STATUS');
    }

    var now     = nowISOString();
    var updates = {
      status:     MATCH_STATUS.ONGOING,
      start_time: now,
      updated_by: payload._user_id || '',
      updated_at: now
    };

    withLock(function () { updateRowObject(mmSheet, match._rowIndex, updates); });
    logAction(payload._user_id, 'MATCH_START', payload.match_id);

    return Object.assign({}, MatchService._sanitizeMatch(match), updates);
  },

  // ===========================================================================
  // INPUT WINNER / FINISH MATCH
  //
  // Duel / King of Table / Round Robin / Tournament:
  //   payload.winner_player  = player_id
  //
  // Team Battle:
  //   payload.winner_team    = 'A' | 'B' | ... (sesuai label team di MATCH_PLAYERS)
  //
  // Singapore Game (multi-rank):
  //   payload.rankings       = [ { player_id, ranking }, ... ]
  //   Tidak ada winner tunggal, semua posisi disimpan ke MATCH_PLAYERS.
  //
  // Custom:
  //   Fleksibel — bisa winner_player, winner_team, atau rankings tergantung config.
  // ===========================================================================
  finish: function (payload) {
    requireFields(payload, ['match_id']);

    var mmSheet = getSheet('db', SHEET_MATCH_MASTER);
    var match   = findRowByField(mmSheet, 'match_id', payload.match_id);
    if (!match) throw new ApiError('MATCH_NOT_FOUND');
    if (match.status === MATCH_STATUS.FINISHED) throw new ApiError('MATCH_ALREADY_FINISHED');
    if (match.status === MATCH_STATUS.CANCELLED) throw new ApiError('MATCH_CANCELLED');

    var mode   = MatchService._resolveMode(
      MatchService._getSessionGameById(match.session_game_id).game_id
    );
    var config = MatchService._parseConfig(
      MatchService._getSessionGameById(match.session_game_id).config
    );
    var now    = nowISOString();
    var updates = {
      status:     MATCH_STATUS.FINISHED,
      end_time:   now,
      updated_by: payload._user_id || '',
      updated_at: now
    };

    if (mode === GAME_MODE.SINGAPORE) {
      // Singapore: wajib kirim rankings array
      if (!payload.rankings || !Array.isArray(payload.rankings) || payload.rankings.length < 2) {
        throw new ApiError('MISSING_FIELD:rankings');
      }
      MatchService._applyRankings(match.match_id, payload.rankings);
      // winner_player = pemain dengan ranking 1
      var top = payload.rankings.filter(function (r) { return r.ranking === 1; })[0];
      if (top) updates.winner_player = top.player_id;

    } else if (mode === GAME_MODE.TEAM_BATTLE) {
      requireFields(payload, ['winner_team']);
      updates.winner_team = payload.winner_team;
      MatchService._applyTeamResult(match.match_id, payload.winner_team);

      // Catat rotasi ke ROTATION_HISTORY untuk Fair Rotation tracking
      var sgForRotation = MatchService._getSessionGameById(match.session_game_id);
      var cfgForRotation = MatchService._parseConfig(sgForRotation.config);
      if (cfgForRotation.rotation_mode === ROTATION_MODE.FAIR) {
        MatchService._recordRotationHistory(
          match.session_game_id,
          match.match_id,
          match.match_id // akan di-resolve di dalam fungsi
        );
      }

    } else {
      // Duel, King of Table, Tournament, Round Robin, Custom (single winner)
      requireFields(payload, ['winner_player']);
      updates.winner_player = payload.winner_player;
      MatchService._applySingleResult(match.match_id, payload.winner_player);
    }

    withLock(function () { updateRowObject(mmSheet, match._rowIndex, updates); });

    // Jika ada next_match_id (Tournament bracket), tidak perlu action di sini
    // — frontend cukup auto-assign pemain ke match berikutnya via match.addPlayer

    // King of Table: setelah match selesai, rotasi antrian otomatis
    if (mode === GAME_MODE.KING_OF_TABLE) {
      MatchService._rotateKingQueue(match.session_game_id, updates.winner_player);
    }

    logAction(payload._user_id, 'MATCH_FINISH', payload.match_id);
    return Object.assign({}, MatchService._sanitizeMatch(match), updates);
  },

  // ===========================================================================
  // CANCEL MATCH
  // ===========================================================================
  cancel: function (payload) {
    requireFields(payload, ['match_id']);

    var mmSheet = getSheet('db', SHEET_MATCH_MASTER);
    var match   = findRowByField(mmSheet, 'match_id', payload.match_id);
    if (!match) throw new ApiError('MATCH_NOT_FOUND');
    if (match.status === MATCH_STATUS.FINISHED) throw new ApiError('MATCH_ALREADY_FINISHED');

    var now     = nowISOString();
    var updates = {
      status:     MATCH_STATUS.CANCELLED,
      updated_by: payload._user_id || '',
      updated_at: now
    };

    withLock(function () { updateRowObject(mmSheet, match._rowIndex, updates); });
    logAction(payload._user_id, 'MATCH_CANCEL', payload.match_id);

    return Object.assign({}, MatchService._sanitizeMatch(match), updates);
  },

  // ===========================================================================
  // SCORE LOG — input skor per pemain (untuk mode poin)
  // payload: match_id, player_id, score
  // ===========================================================================
  addScore: function (payload) {
    requireFields(payload, ['match_id', 'player_id', 'score']);

    // validasi match masih ongoing
    var mmSheet = getSheet('db', SHEET_MATCH_MASTER);
    var match   = findRowByField(mmSheet, 'match_id', payload.match_id);
    if (!match) throw new ApiError('MATCH_NOT_FOUND');
    if (match.status !== MATCH_STATUS.ONGOING) throw new ApiError('MATCH_NOT_ONGOING');

    // validasi pemain terdaftar di match ini
    var mpSheet  = getSheet('db', SHEET_MATCH_PLAYERS);
    var mp       = findAllByField(mpSheet, 'match_id', payload.match_id)
                   .filter(function (r) { return r.player_id === payload.player_id; })[0];
    if (!mp) throw new ApiError('PLAYER_NOT_IN_MATCH');

    var scoreEntry = {
      score_id:   generateUUID(),
      match_id:   payload.match_id,
      player_id:  payload.player_id,
      score:      payload.score,
      input_time: nowISOString(),
      updated_by: payload._user_id || '',
      updated_at: nowISOString()
    };

    var slSheet = getSheet('db', SHEET_SCORE_LOG);
    withLock(function () { appendRowObject(slSheet, scoreEntry); });
    logAction(payload._user_id, 'SCORE_ADD', payload.match_id + ':' + payload.player_id);

    return scoreEntry;
  },

  // Ambil semua score untuk 1 match (untuk tampilan live scoreboard)
  getScores: function (payload) {
    requireFields(payload, ['match_id']);

    var slSheet  = getSheet('db', SHEET_SCORE_LOG);
    var scores   = findAllByField(slSheet, 'match_id', payload.match_id);
    scores.sort(function (a, b) { return a.input_time < b.input_time ? -1 : 1; });

    // Agregasi: total skor per pemain dari semua entri
    var totals = {};
    scores.forEach(function (s) {
      if (!totals[s.player_id]) totals[s.player_id] = 0;
      totals[s.player_id] += parseFloat(s.score) || 0;
    });

    return {
      logs:   scores,
      totals: Object.keys(totals).map(function (pid) {
        return { player_id: pid, total_score: totals[pid] };
      })
    };
  },

  // ===========================================================================
  // QUEUE MANAGEMENT (King of Table & mode antrian lainnya)
  // ===========================================================================

  // Tambah pemain ke antrian
  queueAdd: function (payload) {
    requireFields(payload, ['session_game_id', 'player_id']);

    var qSheet   = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    var existing = findAllByField(qSheet, 'session_game_id', payload.session_game_id)
                   .filter(function (r) { return r.status !== QUEUE_STATUS.DONE && r.status !== QUEUE_STATUS.REMOVED; });

    // cek duplikat aktif
    var alreadyIn = existing.filter(function (r) { return r.player_id === payload.player_id; })[0];
    if (alreadyIn) throw new ApiError('PLAYER_ALREADY_IN_QUEUE');

    var order = existing.length + 1;

    var entry = {
      queue_id:        generateUUID(),
      session_game_id: payload.session_game_id,
      player_id:       payload.player_id,
      queue_order:     order,
      status:          QUEUE_STATUS.WAITING
    };

    withLock(function () { appendRowObject(qSheet, entry); });
    logAction(payload._user_id, 'QUEUE_ADD', payload.session_game_id + ':' + payload.player_id);

    return entry;
  },

  // Ambil state antrian saat ini
  queueGet: function (payload) {
    requireFields(payload, ['session_game_id']);

    var qSheet = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    var rows   = findAllByField(qSheet, 'session_game_id', payload.session_game_id)
                 .filter(function (r) {
                   return r.status !== QUEUE_STATUS.DONE && r.status !== QUEUE_STATUS.REMOVED;
                 });
    rows.sort(function (a, b) {
      return parseInt(a.queue_order, 10) - parseInt(b.queue_order, 10);
    });

    return rows;
  },

  // Hapus pemain dari antrian (REMOVED)
  queueRemove: function (payload) {
    requireFields(payload, ['session_game_id', 'player_id']);

    var qSheet = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    var active = findAllByField(qSheet, 'session_game_id', payload.session_game_id)
                 .filter(function (r) {
                   return r.player_id === payload.player_id &&
                          r.status !== QUEUE_STATUS.DONE &&
                          r.status !== QUEUE_STATUS.REMOVED;
                 });
    if (!active.length) throw new ApiError('PLAYER_NOT_IN_QUEUE');

    var now = nowISOString();
    withLock(function () {
      active.forEach(function (r) {
        updateRowObject(qSheet, r._rowIndex, { status: QUEUE_STATUS.REMOVED });
      });
    });

    logAction(payload._user_id, 'QUEUE_REMOVE',
      payload.session_game_id + ':' + payload.player_id);
    return { removed: payload.player_id };
  },

  // Reorder antrian manual (terima array player_id dalam urutan baru)
  queueReorder: function (payload) {
    requireFields(payload, ['session_game_id', 'ordered_player_ids']);
    if (!Array.isArray(payload.ordered_player_ids) || !payload.ordered_player_ids.length) {
      throw new ApiError('INVALID_FIELD:ordered_player_ids');
    }

    var qSheet = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    var active = findAllByField(qSheet, 'session_game_id', payload.session_game_id)
                 .filter(function (r) {
                   return r.status !== QUEUE_STATUS.DONE && r.status !== QUEUE_STATUS.REMOVED;
                 });

    withLock(function () {
      payload.ordered_player_ids.forEach(function (pid, idx) {
        var row = active.filter(function (r) { return r.player_id === pid; })[0];
        if (row) updateRowObject(qSheet, row._rowIndex, { queue_order: idx + 1 });
      });
    });

    logAction(payload._user_id, 'QUEUE_REORDER', payload.session_game_id);
    return MatchService.queueGet({ session_game_id: payload.session_game_id });
  },

  // ===========================================================================
  // TEAM BATTLE — GENERATE NEXT ROTATION
  //
  // Fair Rotation:
  //   Cari semua kombinasi pasangan yang belum pernah terjadi di sesi ini
  //   (berdasarkan ROTATION_HISTORY), susun 2 tim paling "adil".
  //
  // Random:
  //   Acak daftar pemain, split jadi 2 tim.
  //
  // Manual:
  //   Kembalikan daftar pemain, frontend yang atur.
  //
  // Return: { team_A: [player_id, ...], team_B: [player_id, ...] }
  // ===========================================================================
  generateRotation: function (payload) {
    requireFields(payload, ['session_game_id', 'player_ids']);
    if (!Array.isArray(payload.player_ids) || payload.player_ids.length < 4) {
      throw new ApiError('INSUFFICIENT_PLAYERS'); // minimal 4 untuk 2v2
    }

    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', payload.session_game_id);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');

    var config = MatchService._parseConfig(sessionGame.config);
    var mode   = config.rotation_mode || ROTATION_MODE.RANDOM;
    var players = payload.player_ids;

    if (mode === ROTATION_MODE.FAIR) {
      return MatchService._fairRotation(payload.session_game_id, players, config);
    } else if (mode === ROTATION_MODE.RANDOM) {
      return MatchService._randomRotation(players, config);
    } else {
      // MANUAL: hanya kembalikan daftar pemain untuk diatur frontend
      return { mode: ROTATION_MODE.MANUAL, players: players, team_A: [], team_B: [] };
    }
  },

  // ===========================================================================
  // PRIVATE — PLAYER REGISTRATION TO MATCH_PLAYERS
  // ===========================================================================

  _addSoloPlayers: function (matchId, playerIds) {
    if (!playerIds.length) return;
    var mpSheet = getSheet('db', SHEET_MATCH_PLAYERS);
    withLock(function () {
      playerIds.forEach(function (pid, idx) {
        appendRowObject(mpSheet, {
          match_player_id: generateUUID(),
          match_id:        matchId,
          player_id:       pid,
          team:            '',
          ranking:         0
        });
      });
    });
  },

  _addTeamPlayers: function (matchId, teams) {
    // teams = { A: [pid, pid], B: [pid, pid] }
    var mpSheet = getSheet('db', SHEET_MATCH_PLAYERS);
    withLock(function () {
      Object.keys(teams).forEach(function (teamLabel) {
        (teams[teamLabel] || []).forEach(function (pid) {
          appendRowObject(mpSheet, {
            match_player_id: generateUUID(),
            match_id:        matchId,
            player_id:       pid,
            team:            teamLabel,
            ranking:         0
          });
        });
      });
    });
  },

  _addKingPlayers: function (matchId, sessionGameId, overridePlayers) {
    // Jika override dikirim, pakai itu; kalau tidak, ambil 2 teratas dari antrian
    var players = overridePlayers;
    if (!players.length) {
      var queue = MatchService.queueGet({ session_game_id: sessionGameId });
      var shuffled = queue.sort(function() { return Math.random() - 0.5; });
      players = queue.slice(0, 2).map(function (q) { return q.player_id; });
    }
    if (players.length < 2) throw new ApiError('INSUFFICIENT_PLAYERS');
    MatchService._addSoloPlayers(matchId, players);

    // Tandai mereka sebagai PLAYING di antrian
    var qSheet = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    withLock(function () {
      players.forEach(function (pid) {
        var active = findAllByField(qSheet, 'session_game_id', sessionGameId)
                     .filter(function (r) { return r.player_id === pid; })[0];
        if (active) updateRowObject(qSheet, active._rowIndex, { status: QUEUE_STATUS.PLAYING });
      });
    });
  },

  // ===========================================================================
  // PRIVATE — RESULT APPLICATION
  // ===========================================================================

  // Duel / King / Tournament / Round Robin: 1 winner, 1 loser
  _applySingleResult: function (matchId, winnerPlayerId) {
    var mpSheet = getSheet('db', SHEET_MATCH_PLAYERS);
    var players = findAllByField(mpSheet, 'match_id', matchId);
    withLock(function () {
      players.forEach(function (mp) {
        var rank = (mp.player_id === winnerPlayerId) ? 1 : 2;
        updateRowObject(mpSheet, mp._rowIndex, { ranking: rank });
      });
    });
  },

  // Team Battle: tandai ranking per tim (tim pemenang = 1, lainnya = 2)
  _applyTeamResult: function (matchId, winnerTeam) {
    var mpSheet = getSheet('db', SHEET_MATCH_PLAYERS);
    var players = findAllByField(mpSheet, 'match_id', matchId);
    withLock(function () {
      players.forEach(function (mp) {
        var rank = (mp.team === winnerTeam) ? 1 : 2;
        updateRowObject(mpSheet, mp._rowIndex, { ranking: rank });
      });
    });
  },

  // Singapore Game: simpan ranking langsung dari payload
  _applyRankings: function (matchId, rankings) {
    // rankings = [ { player_id, ranking }, ... ]
    var mpSheet = getSheet('db', SHEET_MATCH_PLAYERS);
    var players = findAllByField(mpSheet, 'match_id', matchId);
    withLock(function () {
      rankings.forEach(function (r) {
        var mp = players.filter(function (p) { return p.player_id === r.player_id; })[0];
        if (mp) updateRowObject(mpSheet, mp._rowIndex, { ranking: r.ranking });
      });
    });
  },

  // ===========================================================================
  // PRIVATE — KING OF TABLE QUEUE ROTATION
  // Pemenang tetap di meja (PLAYING), pecundang turun ke bawah antrian (WAITING),
  // pemain berikutnya dari WAITING naik ke PLAYING.
  // ===========================================================================
  _rotateKingQueue: function (sessionGameId, winnerPlayerId) {
    var qSheet = getSheet('db', SHEET_SESSION_GAME_QUEUE);
    var active = findAllByField(qSheet, 'session_game_id', sessionGameId)
                 .filter(function (r) {
                   return r.status !== QUEUE_STATUS.DONE && r.status !== QUEUE_STATUS.REMOVED;
                 })
                 .sort(function (a, b) {
                   return parseInt(a.queue_order, 10) - parseInt(b.queue_order, 10);
                 });

    var playing  = active.filter(function (r) { return r.status === QUEUE_STATUS.PLAYING; });
    var waiting  = active.filter(function (r) { return r.status === QUEUE_STATUS.WAITING; });

    withLock(function () {
      var newOrder = 1;

      // Pemenang tetap di posisi 1 (PLAYING)
      playing.forEach(function (r) {
        if (r.player_id === winnerPlayerId) {
          updateRowObject(qSheet, r._rowIndex, {
            status:      QUEUE_STATUS.PLAYING,
            queue_order: newOrder++
          });
        }
      });

      // Pemain pertama dari WAITING naik jadi PLAYING
      if (waiting.length > 0) {
        updateRowObject(qSheet, waiting[0]._rowIndex, {
          status:      QUEUE_STATUS.PLAYING,
          queue_order: newOrder++
        });
      }

      // Kalah: pindah ke akhir antrian sebagai WAITING
      playing.forEach(function (r) {
        if (r.player_id !== winnerPlayerId) {
          updateRowObject(qSheet, r._rowIndex, {
            status:      QUEUE_STATUS.WAITING,
            queue_order: active.length
          });
        }
      });

      // Sisa WAITING geser urutan
      waiting.slice(1).forEach(function (r) {
        updateRowObject(qSheet, r._rowIndex, { queue_order: newOrder++ });
      });
    });
  },

  // ===========================================================================
  // PRIVATE — FAIR ROTATION (Team Battle)
  //
  // Algoritma:
  // 1. Ambil semua pasangan partner yang sudah tercatat di ROTATION_HISTORY
  //    (type: PARTNER) untuk session_game ini.
  // 2. Hitung "berat" tiap kombinasi pasangan:
  //    - Belum pernah jadi partner = berat 0 (prioritas tinggi)
  //    - Sudah pernah = berat N (jumlah kali berpasangan)
  // 3. Pilih kombinasi 2+2 dengan total berat minimum → tim paling "fresh".
  // 4. Jika semua sudah pernah berpasangan (satu siklus selesai), mulai siklus baru
  //    (pilih kombinasi dengan berat minimum dari siklus saat ini).
  //
  // Asumsi: 4 pemain untuk 2v2. Untuk ukuran tim lain, logika sama —
  // pilih kombinasi team_size dari total pemain lalu split.
  // ===========================================================================
  _fairRotation: function (sessionGameId, players, config) {
    var teamSize = parseInt(config.team_size, 10) || 2;
    if (players.length < teamSize * 2) throw new ApiError('INSUFFICIENT_PLAYERS');

    // Ambil history partner
    var rhSheet  = getSheet('db', SHEET_ROTATION_HISTORY);
    var history  = findAllByField(rhSheet, 'session_game_id', sessionGameId)
                   .filter(function (r) { return r.type === ROTATION_TYPE.PARTNER; });

    // Hitung frekuensi tiap pasangan
    var pairCount = {};
    history.forEach(function (h) {
      var key = [h.player_1, h.player_2].sort().join('|');
      pairCount[key] = (pairCount[key] || 0) + 1;
    });

    // Generate semua kemungkinan pembagian tim
    var combinations = MatchService._teamCombinations(players, teamSize);

    // Hitung skor tiap kombinasi (lebih rendah = lebih fair)
    var scored = combinations.map(function (combo) {
      var teamA = combo.A;
      var teamB = combo.B;
      var score = 0;

      // Hitung pasangan dalam tim A
      for (var i = 0; i < teamA.length; i++) {
        for (var j = i + 1; j < teamA.length; j++) {
          var key = [teamA[i], teamA[j]].sort().join('|');
          score += (pairCount[key] || 0);
        }
      }
      // Hitung pasangan dalam tim B
      for (var i = 0; i < teamB.length; i++) {
        for (var j = i + 1; j < teamB.length; j++) {
          var key = [teamB[i], teamB[j]].sort().join('|');
          score += (pairCount[key] || 0);
        }
      }

      return { A: teamA, B: teamB, score: score };
    });

    // Ambil kombinasi dengan skor minimum
    scored.sort(function (a, b) { return a.score - b.score; });
    var best = scored[0];

    return {
      mode:   ROTATION_MODE.FAIR,
      team_A: best.A,
      team_B: best.B
    };
  },

  // Generate semua kemungkinan cara membagi `players` menjadi 2 tim @teamSize
  // Dikembalikan sebagai array { A: [...], B: [...] }
  // Untuk menghindari duplikat (A vs B == B vs A), selalu fix 1 pemain di tim A
  _teamCombinations: function (players, teamSize) {
    var results = [];
    var rest    = players.slice(1); // anchor players[0] ke tim A

    // Pilih teamSize-1 anggota lagi untuk tim A dari sisa
    var subsets = MatchService._choose(rest, teamSize - 1);

    subsets.forEach(function (subset) {
      var teamA = [players[0]].concat(subset);
      var teamB = rest.filter(function (p) { return subset.indexOf(p) === -1; });
      if (teamB.length === teamSize) {
        results.push({ A: teamA, B: teamB });
      }
    });

    return results;
  },

  // Pilih k elemen dari array arr — kombinasi C(n,k)
  _choose: function (arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    var first = arr[0];
    var rest  = arr.slice(1);
    var withFirst    = MatchService._choose(rest, k - 1).map(function (c) { return [first].concat(c); });
    var withoutFirst = MatchService._choose(rest, k);
    return withFirst.concat(withoutFirst);
  },

  // Random rotation: acak pemain lalu split
  _randomRotation: function (players, config) {
    var teamSize = parseInt(config.team_size, 10) || 2;
    var shuffled = players.slice().sort(function () { return Math.random() - 0.5; });
    return {
      mode:   ROTATION_MODE.RANDOM,
      team_A: shuffled.slice(0, teamSize),
      team_B: shuffled.slice(teamSize, teamSize * 2)
    };
  },

  // ===========================================================================
  // PRIVATE — CATAT ROTATION HISTORY (dipanggil saat match finish Team Battle)
  // ===========================================================================
  _recordRotationHistory: function (sessionGameId, matchId) {
    var mpSheet  = getSheet('db', SHEET_MATCH_PLAYERS);
    var players  = findAllByField(mpSheet, 'match_id', matchId);
    var rhSheet  = getSheet('db', SHEET_ROTATION_HISTORY);

    // Kelompokkan per tim
    var teams = {};
    players.forEach(function (p) {
      if (!teams[p.team]) teams[p.team] = [];
      teams[p.team].push(p.player_id);
    });

    var teamKeys = Object.keys(teams);
    withLock(function () {
      teamKeys.forEach(function (teamLabel) {
        var members = teams[teamLabel];
        // Catat setiap pasangan partner dalam 1 tim
        for (var i = 0; i < members.length; i++) {
          for (var j = i + 1; j < members.length; j++) {
            appendRowObject(rhSheet, {
              rotation_id:     generateUUID(),
              session_game_id: sessionGameId,
              match_id:        matchId,
              player_1:        members[i],
              player_2:        members[j],
              type:            ROTATION_TYPE.PARTNER
            });
          }
        }
      });

      // Catat pasangan lawan (lintas tim)
      if (teamKeys.length === 2) {
        var teamA = teams[teamKeys[0]];
        var teamB = teams[teamKeys[1]];
        teamA.forEach(function (pA) {
          teamB.forEach(function (pB) {
            appendRowObject(rhSheet, {
              rotation_id:     generateUUID(),
              session_game_id: sessionGameId,
              match_id:        matchId,
              player_1:        pA,
              player_2:        pB,
              type:            ROTATION_TYPE.OPPONENT
            });
          });
        });
      }
    });
  },

  // ===========================================================================
  // PRIVATE — UTILITIES
  // ===========================================================================

  _getSessionGameById: function (sessionGameId) {
    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', sessionGameId);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');
    return sessionGame;
  },

  _parseConfig: function (configStr) {
    try { return JSON.parse(configStr || '{}'); } catch (e) { return {}; }
  },

  // Resolve GAME_MODE constant dari game_name di GAME_MASTER
  _resolveMode: function (gameId) {
    var gSheet = getSheet('db', SHEET_GAME_MASTER);
    var game   = findRowByField(gSheet, 'game_id', gameId);
    if (!game) return GAME_MODE.CUSTOM;

    var name = (game.game_name || '').toLowerCase().replace(/ /g, '_');
    // cocokkan dengan GAME_MODE values
    var match = Object.keys(GAME_MODE).filter(function (k) {
      return GAME_MODE[k] === name;
    })[0];
    return match ? GAME_MODE[match] : GAME_MODE.CUSTOM;
  },

  // Build response lengkap match (include player list)
  _buildMatchResponse: function (match, matchId) {
    var mpSheet  = getSheet('db', SHEET_MATCH_PLAYERS);
    var players  = findAllByField(mpSheet, 'match_id', matchId);
    var slSheet  = getSheet('db', SHEET_SCORE_LOG);
    var scores   = findAllByField(slSheet, 'match_id', matchId);

    var totalsByPlayer = {};
    scores.forEach(function (s) {
      if (!totalsByPlayer[s.player_id]) totalsByPlayer[s.player_id] = 0;
      totalsByPlayer[s.player_id] += parseFloat(s.score) || 0;
    });

    var playerList = players.map(function (p) {
      return {
        match_player_id: p.match_player_id,
        player_id:       p.player_id,
        team:            p.team,
        ranking:         p.ranking,
        total_score:     totalsByPlayer[p.player_id] || 0
      };
    });

    return Object.assign({}, MatchService._sanitizeMatch(match), { players: playerList });
  },

  _sanitizeMatch: function (m) {
    return {
      match_id:        m.match_id,
      session_game_id: m.session_game_id,
      next_match_id:   m.next_match_id,
      match_no:        m.match_no,
      round:           m.round,
      winner_player:   m.winner_player,
      winner_team:     m.winner_team,
      status:          m.status,
      start_time:      m.start_time,
      end_time:        m.end_time,
      updated_by:      m.updated_by,
      updated_at:      m.updated_at
    };
  }
};