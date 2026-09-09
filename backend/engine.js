// =============================================================
// CueHub v3 — engine.gs
// Algoritma generate siklus per game mode
// Ini adalah "otak" sistem — tidak ada UI logic di sini
// =============================================================

// --- Shuffle array (Fisher-Yates) ---
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// =============================================================
// DUEL — 1 vs 1
// Generate satu siklus: semua kombinasi pasangan C(n,2)
// Dioptimasi agar tidak ada pemain main back-to-back
// =============================================================
function buildDuelCycle(playerIds) {
  var ids = playerIds.slice();
  var allPairs = [];

  for (var i = 0; i < ids.length; i++) {
    for (var j = i + 1; j < ids.length; j++) {
      allPairs.push([ids[i], ids[j]]);
    }
  }

  // Greedy: ulangi hingga 30x, ambil hasil dengan paling sedikit back-to-back conflict
  var best = null;
  var bestConflicts = Infinity;

  for (var attempt = 0; attempt < 30; attempt++) {
    var shuffled = shuffleArray(allPairs);
    var cycle = _greedyDuelSort(shuffled);
    var conflicts = _countBackToBack(cycle);
    if (conflicts < bestConflicts) {
      bestConflicts = conflicts;
      best = cycle;
    }
    if (bestConflicts === 0) break;
  }

  return best; // array of [p1, p2]
}

function _greedyDuelSort(pairs) {
  if (pairs.length === 0) return [];
  var result = [pairs[0]];
  var remaining = pairs.slice(1);

  while (remaining.length > 0) {
    var lastPair = result[result.length - 1];
    var lastPlayers = lastPair[0] + ',' + lastPair[1];

    // Cari pair yang tidak share player dengan pair terakhir
    var bestIdx = -1;
    for (var i = 0; i < remaining.length; i++) {
      var candidate = remaining[i];
      if (lastPlayers.indexOf(candidate[0]) === -1 &&
          lastPlayers.indexOf(candidate[1]) === -1) {
        bestIdx = i;
        break;
      }
    }

    if (bestIdx === -1) bestIdx = 0; // tidak ada pilihan, ambil yang pertama

    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  return result;
}

function _countBackToBack(cycle) {
  var count = 0;
  for (var i = 1; i < cycle.length; i++) {
    var prev = cycle[i-1];
    var curr = cycle[i];
    if (curr.indexOf(prev[0]) !== -1 || curr.indexOf(prev[1]) !== -1) {
      count++;
    }
  }
  return count;
}

// =============================================================
// KING OF TABLE
// Tidak ada cycle — state adalah array pemain
// [0] = King (sedang main), [1] = Challenger, [2+] = queue
// =============================================================
function buildKingInitialState(playerIds) {
  return shuffleArray(playerIds);
}

// Setelah match: pemenang jadi King, yang kalah ke belakang antrian
function advanceKingState(state, winnerId) {
  var loserId = state[0] === winnerId ? state[1] : state[0];
  var newState = [winnerId];
  // Sisa antrian (tanpa king lama dan challenger lama)
  var queue = state.slice(2);
  // Tambah next challenger dari antrian
  if (queue.length > 0) {
    newState.push(queue[0]);
    queue = queue.slice(1);
  } else {
    // Tidak ada antrian: loser langsung jadi challenger
    newState.push(loserId);
    return newState;
  }
  // Loser masuk ke belakang antrian
  queue.push(loserId);
  return newState.concat(queue);
}

// =============================================================
// TEAM BATTLE — 2 vs 2
// Generate siklus penuh dengan rotasi partner dan lawan yang adil
// =============================================================
function buildTeamBattleCycle(playerIds) {
  var n = playerIds.length;
  if (n < 4) return null;

  if (n % 2 === 0) {
    return _buildTeamEven(playerIds);
  } else {
    return _buildTeamOdd(playerIds);
  }
}

// Genap: round-robin standar
function _buildTeamEven(ids) {
  var n = ids.length;
  var rounds = n - 1;        // setiap round: n/2 match
  var matchesPerRound = n / 2;
  var cycle = [];

  // Algoritma: satu anchor (ids[0]), sisanya rotasi
  var rotating = ids.slice(1);

  for (var r = 0; r < rounds; r++) {
    var roundPlayers = [ids[0]].concat(rotating);
    // Pasangkan: [0] dengan [n-1], [1] dengan [n-2], dst
    var pairs = [];
    for (var i = 0; i < matchesPerRound; i++) {
      pairs.push([roundPlayers[i], roundPlayers[n - 1 - i]]);
    }
    // Bentuk match dari pasangan yang tidak overlap
    // pairs[0] vs pairs[1], pairs[2] vs pairs[3], dst
    for (var i = 0; i < pairs.length - 1; i += 2) {
      var teamA = pairs[i];
      var teamB = pairs[i + 1];
      cycle.push({ teamA: teamA, teamB: teamB, rest: [] });
    }
    // Rotasi array
    rotating = _rotateRight(rotating);
  }
  return cycle;
}

// Ganjil: satu pemain istirahat per match
function _buildTeamOdd(ids) {
  var n = ids.length;
  var cycle = [];
  // Setiap match: 4 main, 1 istirahat (bergilir adil)
  // Total match dalam satu siklus = n match (setiap player istirahat sekali)
  var restOrder = shuffleArray(ids); // urutan istirahat diacak

  for (var i = 0; i < n; i++) {
    var resting = restOrder[i];
    var active = ids.filter(function(p) { return p !== resting; });
    // Dari 4 player aktif, cari split terbaik
    var split = _findBestSplit(active, cycle);
    cycle.push({ teamA: split.teamA, teamB: split.teamB, rest: [resting] });
  }
  return cycle;
}

// Dari 4 player, pilih split 2v2 yang memaksimalkan variasi partner
function _findBestSplit(fourPlayers, existingCycle) {
  var a = fourPlayers[0], b = fourPlayers[1],
      c = fourPlayers[2], d = fourPlayers[3];

  var options = [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] }
  ];

  // Score: makin jarang jadi partner = lebih baik (score lebih rendah)
  var best = options[0];
  var bestScore = Infinity;

  for (var i = 0; i < options.length; i++) {
    var score = _partnerScore(options[i], existingCycle);
    if (score < bestScore) {
      bestScore = score;
      best = options[i];
    }
  }
  return best;
}

function _partnerScore(option, existingCycle) {
  var score = 0;
  for (var i = 0; i < existingCycle.length; i++) {
    var m = existingCycle[i];
    // Cek apakah partner yang sama sudah pernah muncul
    if (_sameTeam(option.teamA, m.teamA) || _sameTeam(option.teamA, m.teamB) ||
        _sameTeam(option.teamB, m.teamA) || _sameTeam(option.teamB, m.teamB)) {
      score++;
    }
  }
  return score;
}

function _sameTeam(t1, t2) {
  return t1.length === t2.length &&
    t1.slice().sort().join() === t2.slice().sort().join();
}

function _rotateRight(arr) {
  if (arr.length === 0) return arr;
  return [arr[arr.length - 1]].concat(arr.slice(0, arr.length - 1));
}

// =============================================================
// SINGAPORE — 3 pemain main sekaligus
// Generate kombinasi 3 pemain dengan rotasi istirahat yang adil
// =============================================================
function buildSingaporeCycle(playerIds) {
  var n = playerIds.length;
  if (n < 3) return null;
  if (n === 3) {
    // Semua main, tidak ada yang istirahat
    return [{ players: playerIds.slice(), rest: [] }];
  }

  var cycle = [];
  // Generate kombinasi C(n,3) dan pilih yang paling adil
  var allCombos = _combinations3(playerIds);

  // Greedy: pastikan setiap player main dan istirahat dalam jumlah yang seimbang
  var playCount = {};
  var restCount = {};
  playerIds.forEach(function(p) { playCount[p] = 0; restCount[p] = 0; });

  // Target: setiap player main dan istirahat sebanyak mungkin dengan frekuensi seimbang
  // Gunakan semua kombinasi, lalu urutkan agar istirahat tersebar rata
  var shuffledCombos = shuffleArray(allCombos);

  for (var i = 0; i < shuffledCombos.length; i++) {
    var combo = shuffledCombos[i];
    var resting = playerIds.filter(function(p) { return combo.indexOf(p) === -1; });
    cycle.push({ players: combo, rest: resting });
    combo.forEach(function(p) { playCount[p]++; });
    resting.forEach(function(p) { restCount[p]++; });
  }

  // Untuk siklus yang terlalu panjang (banyak player), ambil subset yang paling adil
  // Cukup ambil kelipatan n match agar setiap player istirahat ~(n-3) kali per siklus
  return cycle;
}

function _combinations3(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    for (var j = i + 1; j < arr.length; j++) {
      for (var k = j + 1; k < arr.length; k++) {
        result.push([arr[i], arr[j], arr[k]]);
      }
    }
  }
  return result;
}

// =============================================================
// GENERATE CYCLE — entry point dari segment.gs
// =============================================================
function generateCycle(gameMode, playerIds) {
  if (gameMode === GAME_MODE.DUEL) {
    return { type: 'cycle', data: buildDuelCycle(playerIds) };
  }
  if (gameMode === GAME_MODE.KING) {
    return { type: 'state', data: buildKingInitialState(playerIds) };
  }
  if (gameMode === GAME_MODE.TEAM_BATTLE) {
    return { type: 'cycle', data: buildTeamBattleCycle(playerIds) };
  }
  if (gameMode === GAME_MODE.SINGAPORE) {
    return { type: 'cycle', data: buildSingaporeCycle(playerIds) };
  }
  return null;
}

// =============================================================
// ELO — perhitungan rating setelah match
// =============================================================
function getKFactor(totalGames) {
  if (totalGames < 10) return ELO.K_BEGINNER;
  if (totalGames < 30) return ELO.K_NOVICE;
  if (totalGames < 100) return ELO.K_REGULAR;
  return ELO.K_VETERAN;
}

function eloExpected(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Hitung ELO baru setelah 1v1
// winners: [playerId], losers: [playerId]
// playerElos: { playerId: currentElo }
// playerGames: { playerId: totalGames }
function calculateElo1v1(winnerId, loserId, playerElos, playerGames) {
  var rW = parseFloat(playerElos[winnerId]) || ELO.DEFAULT;
  var rL = parseFloat(playerElos[loserId]) || ELO.DEFAULT;
  var kW = getKFactor(parseInt(playerGames[winnerId]) || 0);
  var kL = getKFactor(parseInt(playerGames[loserId]) || 0);
  var expW = eloExpected(rW, rL);
  var expL = eloExpected(rL, rW);

  var newW = Math.round(rW + kW * (1 - expW));
  var newL = Math.round(rL + kL * (0 - expL));

  var result = {};
  result[winnerId] = newW;
  result[loserId] = newL;
  return result;
}

// Hitung ELO untuk Team Battle (rating tim = rata-rata)
// teamA: [id1, id2], teamB: [id1, id2]
// winnerTeam: 'A' atau 'B'
function calculateEloTeam(teamA, teamB, winnerTeam, playerElos, playerGames) {
  var rA = (parseFloat(playerElos[teamA[0]] || ELO.DEFAULT) +
            parseFloat(playerElos[teamA[1]] || ELO.DEFAULT)) / 2;
  var rB = (parseFloat(playerElos[teamB[0]] || ELO.DEFAULT) +
            parseFloat(playerElos[teamB[1]] || ELO.DEFAULT)) / 2;

  var expA = eloExpected(rA, rB);
  var expB = eloExpected(rB, rA);
  var actualA = winnerTeam === 'A' ? 1 : 0;
  var actualB = winnerTeam === 'B' ? 1 : 0;

  var result = {};
  teamA.forEach(function(pid) {
    var k = getKFactor(parseInt(playerGames[pid]) || 0);
    result[pid] = Math.round((parseFloat(playerElos[pid]) || ELO.DEFAULT) + k * (actualA - expA));
  });
  teamB.forEach(function(pid) {
    var k = getKFactor(parseInt(playerGames[pid]) || 0);
    result[pid] = Math.round((parseFloat(playerElos[pid]) || ELO.DEFAULT) + k * (actualB - expB));
  });
  return result;
}

// Singapore: pemenang (rank 1) vs semua yang lain (1v1 ELO kalkulasi terhadap masing-masing)
function calculateEloSingapore(playerIds, winnerId, playerElos, playerGames) {
  var result = {};
  playerIds.forEach(function(pid) { result[pid] = parseFloat(playerElos[pid]) || ELO.DEFAULT; });

  playerIds.forEach(function(pid) {
    if (pid === winnerId) return;
    var delta = calculateElo1v1(winnerId, pid, playerElos, playerGames);
    result[winnerId] = delta[winnerId];
    result[pid] = delta[pid];
    // Update playerElos untuk kalkulasi berikutnya
    playerElos[winnerId] = result[winnerId];
  });
  return result;
}

// King of Table: sama seperti 1v1
function calculateEloKing(winnerId, loserId, playerElos, playerGames) {
  return calculateElo1v1(winnerId, loserId, playerElos, playerGames);
}
