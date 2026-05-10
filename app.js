// ===================================================
// APP.JS - Logic chính Hệ thống Ôn tập Toán lớp 9
// ===================================================

const FIREBASE_CONFIG ={
  apiKey: "AIzaSyByp6U-vsE-PeSRzPj_OhWigq3mA97t4Gg",
  authDomain: "ontaptoan9-9b81b.firebaseapp.com",
  projectId: "ontaptoan9-9b81b",
  storageBucket: "ontaptoan9-9b81b.firebasestorage.app",
  messagingSenderId: "536428023172",
  appId: "1:536428023172:web:6d303bd3ce31ff1aa3e1d1",
  measurementId: "G-TEFSM23VJR"
};
// ---- TRẠNG THÁI ỨNG DỤNG ----
const AppState = {
  student: null,
  currentTopic: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  timer: null,
  timeLeft: 0,
  totalTime: 0,
  startTime: null,
  isSubmitted: false,
  db: null,
  useFirebase: false,
};

// ---- CHỦ ĐỀ ----
const TOPICS = [
  { id: 'dai-so',   name: 'Đại số',    icon: '🔢', desc: 'Phương trình, hệ phương trình, hàm số', color: '#3b82f6' },
  { id: 'hinh-hoc', name: 'Hình học',  icon: '📐', desc: 'Tam giác, đường tròn, hình không gian',  color: '#10b981' },
  { id: 'tong-hop', name: 'Tổng hợp',  icon: '📚', desc: 'Kết hợp cả đại số và hình học',  color: '#f59e0b' },
];

// ---- CÂU HỎI MẪU ----
const SAMPLE_QUESTIONS = {
  'dai-so': [
    { text: 'Nghiệm của phương trình 2x + 6 = 0 là?', options: ['x = 3', 'x = -3', 'x = 6', 'x = -6'], correct: 1 },
    { text: 'Phương trình x² - 5x + 6 = 0 có nghiệm là?', options: ['x=1 và x=6', 'x=2 và x=3', 'x=-2 và x=-3', 'x=1 và x=-6'], correct: 1 },
    { text: 'Căn bậc hai của 144 là bao nhiêu?', options: ['11', '12', '13', '14'], correct: 1 },
    { text: 'Giá trị của biểu thức 3² + 4² bằng?', options: ['25', '49', '7', '12'], correct: 0 },
    { text: 'Hàm số y = 2x + 1 đồng biến trên?', options: ['(-∞; 0)', '(0; +∞)', '(-∞; +∞)', 'Không xác định'], correct: 2 },
    { text: 'Phương trình x² = 9 có bao nhiêu nghiệm?', options: ['0', '1', '2', '3'], correct: 2 },
    { text: 'Nếu a/b = c/d thì kết luận nào đúng?', options: ['a·d = b·c', 'a+b = c+d', 'a-b = c-d', 'a·b = c·d'], correct: 0 },
    { text: 'Tập nghiệm của bất phương trình 2x - 4 > 0 là?', options: ['x < 2', 'x > 2', 'x ≤ 2', 'x ≥ 2'], correct: 1 },
    { text: 'Giá trị của √(3²+4²) bằng?', options: ['5', '7', '√7', '12'], correct: 0 },
    { text: 'Hệ phương trình có vô số nghiệm khi nào?', options: ['Hai phương trình mâu thuẫn', 'Hai phương trình tương đương', 'Chỉ có một nghiệm', 'Không có nghiệm'], correct: 1 },
  ],
  'hinh-hoc': [
    { text: 'Diện tích hình tròn có bán kính r tính bằng công thức?', options: ['S = πr', 'S = 2πr', 'S = πr²', 'S = 2πr²'], correct: 2 },
    { text: 'Hai đường thẳng song song thì?', options: ['Cắt nhau tại 1 điểm', 'Không có điểm chung', 'Trùng nhau', 'Vuông góc nhau'], correct: 1 },
    { text: 'Tổng ba góc trong tam giác bằng?', options: ['90°', '180°', '270°', '360°'], correct: 1 },
    { text: 'Trong tam giác vuông, định lý Pytago phát biểu?', options: ['a² = b² + c²', 'a = b + c', 'a² = b² - c²', 'a = b·c'], correct: 0 },
    { text: 'Chu vi hình tròn bán kính r tính bằng?', options: ['C = πr', 'C = πr²', 'C = 2πr', 'C = 2πr²'], correct: 2 },
    { text: 'Đường kính của đường tròn bằng?', options: ['Chu vi / π', '2 × bán kính', 'Diện tích / π', 'Bán kính / 2'], correct: 1 },
    { text: 'Góc nội tiếp bằng bao nhiêu lần góc tâm cùng chắn một cung?', options: ['Bằng nhau', 'Gấp đôi', 'Bằng một nửa', 'Gấp ba'], correct: 2 },
    { text: 'Tam giác đều có bao nhiêu trục đối xứng?', options: ['1', '2', '3', '6'], correct: 2 },
    { text: 'Hình thang cân có đặc điểm nào đặc biệt?', options: ['Hai đường chéo bằng nhau', 'Hai cạnh bên song song', 'Bốn góc bằng nhau', 'Bốn cạnh bằng nhau'], correct: 0 },
    { text: 'Thể tích hình cầu bán kính r tính bằng?', options: ['V = 4πr²', 'V = (4/3)πr³', 'V = πr³', 'V = (1/3)πr³'], correct: 1 },
  ],
  'tong-hop': [
    { text: 'Phương trình nào sau đây có nghiệm x = 2?', options: ['x + 3 = 0', '2x - 4 = 0', 'x² = 0', '3x + 6 = 0'], correct: 1 },
    { text: 'Diện tích hình vuông cạnh a là?', options: ['4a', '2a²', 'a²', 'a³'], correct: 2 },
    { text: 'Căn bậc hai của 0,01 là?', options: ['0,001', '0,01', '0,1', '1'], correct: 2 },
    { text: 'Tam giác có ba cạnh bằng nhau gọi là?', options: ['Tam giác vuông', 'Tam giác cân', 'Tam giác đều', 'Tam giác thường'], correct: 2 },
    { text: 'Giải phương trình |x| = 5, nghiệm là?', options: ['x = 5', 'x = -5', 'x = ±5', 'Vô nghiệm'], correct: 2 },
    { text: 'Góc bẹt có số đo bằng?', options: ['45°', '90°', '180°', '360°'], correct: 2 },
    { text: 'Số vô tỉ là số có dạng?', options: ['Phân số a/b (b≠0)', 'Số thập phân hữu hạn', 'Số thập phân vô hạn tuần hoàn', 'Số thập phân vô hạn không tuần hoàn'], correct: 3 },
    { text: 'Hàm số y = x² có đồ thị là?', options: ['Đường thẳng', 'Parabol', 'Đường tròn', 'Elip'], correct: 1 },
    { text: 'Hai tam giác đồng dạng thì tỉ số diện tích bằng?', options: ['Tỉ số đồng dạng', 'Bình phương tỉ số đồng dạng', 'Lập phương tỉ số đồng dạng', 'Căn bậc hai tỉ số đồng dạng'], correct: 1 },
    { text: 'Phương trình bậc hai ax²+bx+c=0 có hai nghiệm phân biệt khi?', options: ['Δ = 0', 'Δ < 0', 'Δ > 0', 'a = 0'], correct: 2 },
  ],
};

// ====================================================
// KHỞI TẠO FIREBASE
// ====================================================
function initFirebase() {
  // Kiểm tra config override từ localStorage (từ tính năng nhập nhanh)
  const override = localStorage.getItem('firebase_config_override');
  let config = FIREBASE_CONFIG;
  if (override) {
    try { config = JSON.parse(override); } catch(e) {}
  }

  try {
    if (typeof firebase !== 'undefined' && config.apiKey && config.apiKey !== 'YOUR_API_KEY') {
      // Tránh khởi tạo nhiều lần
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      AppState.db = firebase.firestore();
      AppState.useFirebase = true;
      console.log('✅ Firebase khởi tạo thành công');
    } else {
      console.warn('⚠️ Firebase chưa được cấu hình. Dùng dữ liệu mẫu / localStorage.');
    }
  } catch (error) {
    console.error('❌ Lỗi Firebase:', error);
  }
}

// ====================================================
// FIRESTORE: LƯU VÀ ĐỌC DỮ LIỆU
// ====================================================

// Lưu kết quả bài thi
async function saveResult(resultData) {
  if (AppState.useFirebase && AppState.db) {
    await AppState.db.collection('results').add({
      ...resultData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Lưu vào localStorage
    const results = JSON.parse(localStorage.getItem('quiz_results') || '[]');
    results.push({ ...resultData, timestamp: new Date().toISOString() });
    localStorage.setItem('quiz_results', JSON.stringify(results));
  }
}

// Lấy tất cả kết quả
async function fetchResults() {
  if (AppState.useFirebase && AppState.db) {
    try {
      const snapshot = await AppState.db.collection('results')
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString() }));
    } catch (e) {
      console.error('Lỗi đọc Firestore:', e);
      return [];
    }
  } else {
    return JSON.parse(localStorage.getItem('quiz_results') || '[]');
  }
}

// Upload câu hỏi lên Firestore
async function uploadQuestions(questions) {
  if (AppState.useFirebase && AppState.db) {
    const batch = AppState.db.batch();
    questions.forEach(q => {
      const ref = AppState.db.collection('questions').doc();
      batch.set(ref, { ...q, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  } else {
    // Lưu vào localStorage
    const existing = JSON.parse(localStorage.getItem('quiz_questions') || '{}');
    questions.forEach(q => {
      const topic = q.topic || 'tong-hop';
      if (!existing[topic]) existing[topic] = [];
      existing[topic].push(q);
    });
    localStorage.setItem('quiz_questions', JSON.stringify(existing));
  }
}

// Lấy câu hỏi theo chủ đề
async function fetchQuestions(topic) {
  if (AppState.useFirebase && AppState.db) {
    try {
      const snapshot = await AppState.db.collection('questions')
        .where('topic', '==', topic)
        .get();
      if (snapshot.docs.length > 0) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      console.error('Lỗi đọc câu hỏi:', e);
    }
  }

  // Thử localStorage
  const stored = JSON.parse(localStorage.getItem('quiz_questions') || '{}');
  if (stored[topic] && stored[topic].length > 0) {
    return stored[topic];
  }

  // Dùng câu hỏi mẫu (trừ khi đã bị ẩn)
  if (localStorage.getItem('hide_sample_questions') === '1') {
    return []; // Thầy đã ẩn câu hỏi mẫu
  }
  return SAMPLE_QUESTIONS[topic] || SAMPLE_QUESTIONS['tong-hop'];
}

// ====================================================
// HỆ THỐNG DANH HIỆU
// ====================================================
const RANK_SYSTEM = [
  { min: 0,   max: 4.9,  title: 'Tập Sự',               icon: '🥈', cls: 'rank-silver',      emoji: '🥈' },
  { min: 5,   max: 5.9,  title: 'Chiến Binh Toán Học',  icon: '🥇', cls: 'rank-gold',        emoji: '⚔️' },
  { min: 6,   max: 6.9,  title: 'Bậc Thầy Toán Học',   icon: '💎', cls: 'rank-diamond',     emoji: '💎' },
  { min: 7,   max: 7.9,  title: 'Huyền Thoại Toán Học', icon: '🔮', cls: 'rank-legend',      emoji: '🔮' },
  { min: 8,   max: 8.9,  title: 'Cao Thủ Toán Học',    icon: '🌟', cls: 'rank-master',      emoji: '🌟' },
  { min: 9,   max: 9.9,  title: 'Đại Cao Thủ Toán Học',icon: '👑', cls: 'rank-grandmaster', emoji: '👑' },
  { min: 10,  max: 10,   title: 'Thách Đấu Toán Học',  icon: '🔥', cls: 'rank-challenger',  emoji: '🔥' },
];

function getRank(score) {
  return RANK_SYSTEM.find(r => score >= r.min && score <= r.max) || RANK_SYSTEM[0];
}

function renderRankBadge(score) {
  const r = getRank(score);
  return `<span class="rank-badge ${r.cls}">${r.icon} ${r.title}</span>`;
}

// ====================================================
// LỜI CHÀO ĐỘNG VIÊN
// ====================================================
const WELCOME_MESSAGES = [
  'học hỏi không ngừng — chiến thắng đang chờ! 💪',
  'hôm nay giỏi hơn hôm qua là chiến thắng! 🚀',
  'mỗi câu đúng là một bước lên bục vinh quang! 🏆',
  'tập trung, nỗ lực — thành công sẽ đến! ⭐',
  'đừng bỏ cuộc — cao thủ luôn kiên trì! 🔥',
];

function showWelcomeBanner(name) {
  const msg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
  const banner = document.createElement('div');
  banner.className = 'welcome-banner';
  banner.textContent = `Chào ${name}, chúc bạn ${msg}`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));
  setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 500);
  }, 3800);
}

// ====================================================
// HIỆU ỨNG PHÁO HOA
// ====================================================
// ====================================================
// ÂM THANH (Web Audio API - không cần file ngoài)
// ====================================================
function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Vỗ tay: nhiều click noise ngắn liên tiếp
    const now = ctx.currentTime;
    for (let c = 0; c < 6; c++) {
      const bufSize = ctx.sampleRate * 0.04;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      // Bộ lọc bandpass để nghe giống vỗ tay hơn
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 800;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now + c * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c * 0.08 + 0.18);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now + c * 0.08);
    }
  } catch(e) {}
}

function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    // Âm "tuột" đi xuống: oscillator glide from 400 → 100 Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.55);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch(e) {}
}

// ====================================================
// PHÁO HOA TOÀN MÀN HÌNH
// ====================================================
function launchFullscreenFireworks() {
  const colors = ['#fbbf24','#10b981','#3b82f6','#f472b6','#a78bfa','#34d399','#fb923c','#f43f5e','#06b6d4'];
  const W = window.innerWidth;
  const H = window.innerHeight;

  // 5 đợt bắn từ các vị trí ngẫu nhiên
  const bursts = [
    { x: W * 0.2, y: H * 0.3 },
    { x: W * 0.8, y: H * 0.25 },
    { x: W * 0.5, y: H * 0.2 },
    { x: W * 0.15, y: H * 0.6 },
    { x: W * 0.85, y: H * 0.55 },
  ];

  bursts.forEach((burst, bi) => {
    setTimeout(() => {
      for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'firework-particle';
        const angle = (i / 28) * 360 + Math.random() * 10;
        const dist = 80 + Math.random() * 140;
        const dx = Math.cos(angle * Math.PI / 180) * dist;
        const dy = Math.sin(angle * Math.PI / 180) * dist;
        const size = 6 + Math.random() * 8;
        p.style.cssText = `
          left:${burst.x}px; top:${burst.y}px;
          width:${size}px; height:${size}px;
          background:${colors[(i + bi * 3) % colors.length]};
          --dx:${dx}px; --dy:${dy}px;
          animation-duration:${0.6 + Math.random() * 0.5}s;
          border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
          position:fixed; z-index:9991;
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }
    }, bi * 120);
  });
}



// ====================================================
// BẢNG VINH DANH TOP 3 - TRANG LÀM BÀI
// ====================================================
async function loadHonorBoard() {
  const board = document.getElementById('honorBoard');
  if (!board) return;

  const results = await fetchResults();
  // Lấy điểm cao nhất của mỗi học sinh
  const bestMap = {};
  results.forEach(r => {
    const key = r.studentName + '_' + r.studentClass;
    if (!bestMap[key] || r.score > bestMap[key].score ||
        (r.score === bestMap[key].score && r.timeTaken < bestMap[key].timeTaken)) {
      bestMap[key] = r;
    }
  });
  const top3 = Object.values(bestMap)
    .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 3);

  if (top3.length === 0) {
    board.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có dữ liệu. Hãy làm bài đầu tiên! 🎯</p>`;
    return;
  }

  // Thứ tự hiển thị: hạng 2 - hạng 1 - hạng 3 (podium style)
  const slots = [
    { rank: 1, data: top3[0], pos: 'gold',   icon: '🥇', effect: 1 },
    { rank: 2, data: top3[1], pos: 'silver', icon: '🥈', effect: 2 },
    { rank: 3, data: top3[2], pos: 'bronze', icon: '🥉', effect: 3 },
  ].filter(s => s.data);

  // Sắp xếp hiển thị theo podium: 2-1-3
  const displayOrder = [
    slots.find(s => s.rank === 2),
    slots.find(s => s.rank === 1),
    slots.find(s => s.rank === 3),
  ].filter(Boolean);

  board.innerHTML = `
    <div class="honor-podium">
      ${displayOrder.map(s => `
        <div class="honor-slot honor-${s.pos}" onclick="honorFirework(${s.effect}, '${s.data.studentName}')" title="Chạm để chúc mừng!">
          <div class="honor-crown">${s.icon}</div>
          <div class="honor-avatar">${s.data.studentName.charAt(0).toUpperCase()}</div>
          <div class="honor-name">${s.data.studentName}</div>
          <div class="honor-class">${s.data.studentClass}</div>
          <div class="honor-score">${s.data.score}<span>/10</span></div>
          <div class="honor-block">
            <div class="honor-rank-num">#${s.rank}</div>
          </div>
          <div class="honor-tap-hint">👆 Chạm!</div>
        </div>
      `).join('')}
    </div>
    <p class="honor-footer">✨ Chạm vào tên để tặng pháo hoa chúc mừng!</p>
  `;
}

// 3 hiệu ứng pháo hoa + âm thanh khác nhau cho từng hạng
function honorFirework(effect, name) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  if (effect === 1) {
    // 🥇 Hạng 1: Pháo hoa bùng nổ rực rỡ + kèn fanfare
    _firework_burst(100, ['#fbbf24','#fef08a','#f59e0b','#fff','#fde68a','#f43f5e']);
    // Âm fanfare kèn
    [[523,0],[659,0.15],[784,0.3],[1047,0.45]].forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.18, now + t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.35);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + t); osc.stop(now + t + 0.4);
    });
    showToast(`🥇 Xuất sắc! Chúc mừng ${name} đứng đầu! 🎊`, 'success', 3000);
  }
  else if (effect === 2) {
    // 🥈 Hạng 2: Pháo hoa xoáy + âm chuông ngân
    _firework_spiral(60, ['#e2e8f0','#94a3b8','#cbd5e1','#7dd3fc','#38bdf8','#fff']);
    // Âm chuông trong
    [880, 1108, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 1.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 1.3);
    });
    showToast(`🥈 Tuyệt vời! ${name} xếp hạng 2! 🌟`, 'success', 3000);
  }
  else {
    // 🥉 Hạng 3: Pháo hoa mưa sao + âm vui nhộn
    _firework_rain(80, ['#f97316','#fb923c','#fdba74','#10b981','#34d399','#a78bfa']);
    // Âm vui nhộn bouncy
    [392, 494, 587, 698, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.15, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
    });
    showToast(`🥉 Giỏi lắm! ${name} xếp hạng 3! 🎉`, 'success', 3000);
  }
}

// Hiệu ứng 1: Nổ bùng từ trung tâm (cho hạng 1)
function _firework_burst(count, colors) {
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.35;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'firework-particle';
    const angle = (i / count) * 360 + Math.random() * 8;
    const dist = 60 + Math.random() * 180;
    const dx = Math.cos(angle * Math.PI / 180) * dist;
    const dy = Math.sin(angle * Math.PI / 180) * dist;
    const size = 5 + Math.random() * 9;
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
      background:${colors[i % colors.length]};--dx:${dx}px;--dy:${dy}px;
      animation-duration:${0.7 + Math.random() * 0.6}s;
      border-radius:${Math.random() > 0.4 ? '50%' : '2px'};position:fixed;z-index:9991;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
  // Thêm 3 đợt nổ nữa ở các góc
  [[0.2,0.25],[0.8,0.25],[0.5,0.15]].forEach(([rx,ry], bi) => {
    setTimeout(() => {
      const bx = window.innerWidth*rx, by = window.innerHeight*ry;
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'firework-particle';
        const angle = Math.random() * 360;
        const dist = 40 + Math.random() * 120;
        p.style.cssText = `left:${bx}px;top:${by}px;width:${4+Math.random()*7}px;height:${4+Math.random()*7}px;
          background:${colors[i%colors.length]};--dx:${Math.cos(angle*Math.PI/180)*dist}px;
          --dy:${Math.sin(angle*Math.PI/180)*dist}px;animation-duration:${0.6+Math.random()*0.5}s;
          border-radius:50%;position:fixed;z-index:9991;`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }
    }, 150 + bi * 120);
  });
}

// Hiệu ứng 2: Xoáy ốc (cho hạng 2)
function _firework_spiral(count, colors) {
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'firework-particle';
      const angle = (i / count) * 720; // 2 vòng xoáy
      const dist = 30 + (i / count) * 160;
      const dx = Math.cos(angle * Math.PI / 180) * dist;
      const dy = Math.sin(angle * Math.PI / 180) * dist - 80;
      const size = 4 + Math.random() * 7;
      p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
        background:${colors[i%colors.length]};--dx:${dx}px;--dy:${dy}px;
        animation-duration:${0.8+Math.random()*0.5}s;
        border-radius:50%;position:fixed;z-index:9991;`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }, i * 12);
  }
}

// Hiệu ứng 3: Mưa sao từ trên xuống (cho hạng 3)
function _firework_rain(count, colors) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'firework-particle';
      const x = Math.random() * window.innerWidth;
      const dy = 80 + Math.random() * 200;
      const dx = (Math.random() - 0.5) * 80;
      const size = 4 + Math.random() * 8;
      p.style.cssText = `left:${x}px;top:${-10}px;width:${size}px;height:${size}px;
        background:${colors[i%colors.length]};--dx:${dx}px;--dy:${dy}px;
        animation-duration:${0.6+Math.random()*0.7}s;
        border-radius:${Math.random()>0.5?'50%':'2px'};position:fixed;z-index:9991;`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }, i * 15);
  }
}


function renderStudyProgress(answered, total) {
  const pct = total > 0 ? Math.round(answered / total * 100) : 0;
  return `
    <div class="study-progress-wrap">
      <div class="study-progress-label">
        <span>📖 Tiến trình làm bài</span>
        <span>${answered} / ${total} câu &nbsp;·&nbsp; <strong>${pct}%</strong></span>
      </div>
      <div class="study-progress-bar-outer">
        <div class="study-progress-bar-inner" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}


function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ====================================================
// TRANG CHỦ - RENDER GIAO DIỆN
// ====================================================
function renderHome() {
  const app = document.getElementById('app');
  if (!app) return;

  const topicStyles = [
    { grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', shadow: 'rgba(99,102,241,0.35)', glyph: '∑' },
    { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', shadow: 'rgba(16,185,129,0.35)', glyph: '△' },
    { grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', shadow: 'rgba(239,68,68,0.35)',  glyph: '∞' },
  ];

  app.innerHTML = `
    <!-- Hero banner -->
    <div class="home-hero">
      <div class="home-hero-bg"></div>
      <div class="home-hero-content">
        <div class="home-hero-badge">🎓 Luyện thi tuyển sinh lớp 10</div>
        <h1 class="home-hero-title">Ôn Tập Toán 9<br><span>Thông Minh</span></h1>
        <p class="home-hero-sub">Luyện đề trắc nghiệm chuẩn cấu trúc thi — xem điểm ngay sau khi nộp bài</p>
      </div>
      <div class="home-hero-deco">
        <span class="deco-shape s1">π</span>
        <span class="deco-shape s2">∫</span>
        <span class="deco-shape s3">√</span>
        <span class="deco-shape s4">∑</span>
        <span class="deco-shape s5">△</span>
      </div>
    </div>

    <!-- Student info -->
    <div class="home-info-card">
      <div class="home-info-icon">✏️</div>
      <div class="home-info-fields">
        <div class="home-field">
          <label>Họ và tên</label>
          <input class="home-input" id="studentName" type="text"
                 placeholder="Nguyễn Văn An" autocomplete="name">
        </div>
        <div class="home-field">
          <label>Lớp</label>
          <input class="home-input" id="studentClass" type="text"
                 placeholder="Ví dụ: 9A, 9B2..." maxlength="10" autocomplete="off">
        </div>
      </div>
    </div>

    <!-- Topic cards -->
    <div class="home-section-label">Chọn chủ đề để bắt đầu</div>
    <div class="home-topics">
      ${TOPICS.map((t, i) => `
        <div class="home-topic-card" onclick="selectTopic('${t.id}')"
             style="--tgrad:${topicStyles[i].grad};--tshadow:${topicStyles[i].shadow}">
          <div class="htc-glyph">${topicStyles[i].glyph}</div>
          <div class="htc-body">
            <div class="htc-icon">${t.icon}</div>
            <div class="htc-name">${t.name}</div>
            <div class="htc-desc">${t.desc}</div>
          </div>
          <div class="htc-footer">
            <span class="htc-arrow">→</span>
</div>
        </div>
      `).join('')}
    </div>

    <!-- Bảng vinh danh Top 3 -->
    <div class="home-section-label" style="margin-top:28px;">🏆 Bảng Vinh Danh</div>
    <div class="honor-board" id="honorBoard">
      <div class="honor-loading"><div class="spinner"></div></div>
    </div>
  `;

  // Load top 3 sau khi render xong
  loadHonorBoard();
}

// Chọn chủ đề và bắt đầu
async function selectTopic(topicId) {
  const nameInput = document.getElementById('studentName');
  const classInput = document.getElementById('studentClass');

  if (!nameInput || nameInput.value.trim().length < 2) {
    showToast('Vui lòng nhập họ tên (ít nhất 2 ký tự)!', 'warning');
    nameInput && nameInput.focus();
    return;
  }

  const classVal = (classInput ? classInput.value.trim() : '') || '9?';
  AppState.student = {
    name: nameInput.value.trim(),
    class: classVal,
  };
  AppState.currentTopic = TOPICS.find(t => t.id === topicId);

  // Hiển thị lời chào động viên
  showWelcomeBanner(AppState.student.name);

  showToast('Đang tải câu hỏi...', 'info', 1500);

  try {
    let questions = await fetchQuestions(topicId);

    // Trộn toàn bộ câu hỏi (không giới hạn số lượng)
    questions = shuffleArray(questions);

    if (questions.length === 0) {
      showToast('Không có câu hỏi cho chủ đề này!', 'error');
      return;
    }

    AppState.questions = questions;
    AppState.currentIndex = 0;
    AppState.answers = {};
    AppState.isSubmitted = false;
    // 2 phút mỗi câu, tối thiểu 10 phút
    AppState.totalTime = Math.max(questions.length * 120, 600);
    AppState.timeLeft = AppState.totalTime;
    AppState.startTime = Date.now();

    renderQuiz();
    startTimer();
    // Render công thức toán sau khi HTML đã vào DOM
    setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(); }, 100);

  } catch (error) {
    showToast('Lỗi tải câu hỏi: ' + error.message, 'error');
  }
}

// ====================================================
// GIAO DIỆN LÀM BÀI
// ====================================================
function renderQuiz() {
  const app = document.getElementById('app');
  if (!app) return;

  const topic = AppState.currentTopic;
  const total = AppState.questions.length;
  const answered = Object.keys(AppState.answers).length;
  const pct = total > 0 ? Math.round((AppState.currentIndex + 1) / total * 100) : 0;

  app.innerHTML = `
    <!-- Thanh tiến trình ôn tập -->
    ${renderStudyProgress(answered, total)}

    <!-- Quiz header -->
    <div class="quiz-header card mb-3">
      <div class="quiz-meta">
        <span>📚 ${topic.name}</span>
        <span>👤 ${AppState.student.name} - ${AppState.student.class}</span>
        <span class="timer" id="timerDisplay">⏱️ ${formatTime(AppState.timeLeft)}</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" id="progressBar" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-top:4px;">
        <span>Câu ${AppState.currentIndex + 1} / ${total}</span>
        <span>Đã trả lời: ${answered} / ${total}</span>
      </div>
    </div>

    <!-- Câu hỏi -->
    <div class="card mb-3" id="questionCard">
      ${renderQuestion()}
    </div>

    <!-- Điều hướng -->
    <div class="quiz-nav card mb-3">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-outline" onclick="prevQuestion()" ${AppState.currentIndex === 0 ? 'disabled' : ''}>
          ← Câu trước
        </button>
        <div class="question-dots" id="questionDots">
          ${AppState.questions.map((_, i) => `
            <button class="dot ${i === AppState.currentIndex ? 'active' : ''} ${AppState.answers[i] !== undefined ? 'answered' : ''}"
                    onclick="goToQuestion(${i})">${i + 1}</button>
          `).join('')}
        </div>
        ${AppState.currentIndex < total - 1
          ? `<button class="btn btn-primary" onclick="nextQuestion()">Câu tiếp →</button>`
          : `<button class="btn btn-success" onclick="confirmSubmit()">✅ Nộp bài</button>`
        }
      </div>
    </div>

    <!-- Nút nộp bài -->
    <div style="text-align:center;">
      <button class="btn btn-outline btn-sm" onclick="confirmSubmit()">🏁 Nộp bài sớm</button>
    </div>
  `;
}

function renderQuestion() {
  const q = AppState.questions[AppState.currentIndex];
  const selected = AppState.answers[AppState.currentIndex];
  const alreadyAnswered = selected !== undefined;
  const opts = ['A', 'B', 'C', 'D'];

  // Hình ảnh minh họa (nếu có)
  const imgHtml = q.imageUrl ? `
    <div style="text-align:center;margin:12px 0;">
      <img src="${q.imageUrl}" alt="Hình minh họa câu ${AppState.currentIndex+1}"
           style="max-width:100%;max-height:320px;border-radius:10px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.1);">
    </div>` : '';

  // Khi đã chọn: highlight đáp án đúng/sai, vô hiệu hóa tất cả nút
  const getOptClass = (i) => {
    if (!alreadyAnswered) return selected === i ? 'selected' : '';
    if (i === q.correct) return 'reveal-correct';
    if (i === selected) return selected === q.correct ? 'correct-flash' : 'wrong-flash';
    return 'disabled-opt';
  };

  // Giải thích khi sai
  const explainHtml = (alreadyAnswered && selected !== q.correct) ? `
    <div class="explain-box" id="explainBox">
      ❌ Sai rồi! Đáp án đúng là <strong>${opts[q.correct]}.</strong> <span class="explain-math">${q.options[q.correct]}</span>
      — xem lại để rút kinh nghiệm nhé! 📖
    </div>` : '';

  const html = `
    <div class="card-header">
      <h3 style="font-size:1rem;font-weight:600;line-height:1.6;">
        Câu ${AppState.currentIndex + 1}: ${q.text}
      </h3>
    </div>
    <div class="card-body">
      ${imgHtml}
      <div class="options-list">
        ${q.options.map((opt, i) => `
          <button class="option-btn ${getOptClass(i)}"
                  ${alreadyAnswered ? 'disabled' : `onclick="selectAnswer(${i})"`}
                  style="${alreadyAnswered ? 'cursor:default;' : ''}">
            <span class="option-label">${opts[i]}</span>
            <span class="option-text">${opt}</span>
          </button>
        `).join('')}
      </div>
      ${explainHtml}
    </div>
  `;

  // Re-render MathJax sau khi nội dung được chèn vào DOM
  setTimeout(() => {
    if (window.MathJax && MathJax.typesetPromise) {
      const card = document.getElementById('questionCard');
      if (card) MathJax.typesetPromise([card]);
    }
  }, 80);

  return html;
}

function selectAnswer(optionIndex) {
  if (AppState.isSubmitted) return;
  // Không cho chọn lại nếu câu này đã có đáp án
  if (AppState.answers[AppState.currentIndex] !== undefined) return;

  const q = AppState.questions[AppState.currentIndex];
  const isCorrect = optionIndex === q.correct;

  AppState.answers[AppState.currentIndex] = optionIndex;

  if (isCorrect) {
    // ✅ ĐÚNG: pháo hoa toàn màn hình + vỗ tay + re-render câu với trạng thái khoá
    playCorrectSound();
    launchFullscreenFireworks();
    showToast('🎉 Chính xác! Rất tốt!', 'success', 1500);

    // Re-render để lock nút và highlight đúng
    const card = document.getElementById('questionCard');
    if (card) {
      card.innerHTML = renderQuestionLocked(q, optionIndex, true);
      if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([card]);
    }
    updateDots();
    setTimeout(() => {
      if (AppState.currentIndex < AppState.questions.length - 1) nextQuestion();
    }, 1400);

  } else {
    // ❌ SAI: âm tuột + rung + hiện đáp án + giải thích
    playWrongSound();
    showToast('💪 Chưa đúng — xem đáp án và cố lên!', 'warning', 2000);

    // Re-render để lock nút, highlight sai/đúng, hiện explain
    const card = document.getElementById('questionCard');
    if (card) {
      card.innerHTML = renderQuestionLocked(q, optionIndex, false);
      if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([card]);
      // Rung thẻ câu hỏi
      card.style.animation = 'none';
      requestAnimationFrame(() => {
        card.style.animation = 'shake .45s ease';
        setTimeout(() => card.style.animation = '', 500);
      });
    }
    updateDots();
    setTimeout(() => {
      if (AppState.currentIndex < AppState.questions.length - 1) {
        setTimeout(nextQuestion, 1200);
      }
    }, 400);
  }
}

// Render câu hỏi ở trạng thái đã khoá (sau khi chọn)
function renderQuestionLocked(q, selected, isCorrect) {
  const opts = ['A', 'B', 'C', 'D'];
  const imgHtml = q.imageUrl ? `
    <div style="text-align:center;margin:12px 0;">
      <img src="${q.imageUrl}" alt="Hình minh họa"
           style="max-width:100%;max-height:320px;border-radius:10px;border:1px solid var(--border);">
    </div>` : '';

  const explainHtml = !isCorrect ? `
    <div class="explain-box" id="explainBox">
      ❌ Sai rồi! Đáp án đúng là <strong>${opts[q.correct]}.</strong> <span class="explain-math">${q.options[q.correct]}</span>
      — xem lại để rút kinh nghiệm nhé! 📖
    </div>` : `
    <div style="margin-top:12px;padding:10px 16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:8px;font-size:0.88rem;color:#166534;animation:firework-pop .35s ease;">
      ✅ Chính xác! Tiếp tục phát huy nhé! 🌟
    </div>`;

  return `
    <div class="card-header">
      <h3 style="font-size:1rem;font-weight:600;line-height:1.6;">
        Câu ${AppState.currentIndex + 1}: ${q.text}
      </h3>
    </div>
    <div class="card-body">
      ${imgHtml}
      <div class="options-list">
        ${q.options.map((opt, i) => {
          let cls = 'disabled-opt';
          if (i === q.correct) cls = 'reveal-correct';
          else if (i === selected && !isCorrect) cls = 'wrong-flash';
          return `
            <button class="option-btn ${cls}" disabled style="cursor:default;">
              <span class="option-label">${opts[i]}</span>
              <span class="option-text">${opt}</span>
            </button>`;
        }).join('')}
      </div>
      ${explainHtml}
    </div>
  `;
}



function updateDots() {
  const dots = document.getElementById('questionDots');
  if (!dots) return;
  dots.innerHTML = AppState.questions.map((_, i) => `
    <button class="dot ${i === AppState.currentIndex ? 'active' : ''} ${AppState.answers[i] !== undefined ? 'answered' : ''}"
            onclick="goToQuestion(${i})">${i + 1}</button>
  `).join('');
}

function nextQuestion() {
  if (AppState.currentIndex < AppState.questions.length - 1) {
    AppState.currentIndex++;
    renderQuiz();
  }
}

function prevQuestion() {
  if (AppState.currentIndex > 0) {
    AppState.currentIndex--;
    renderQuiz();
  }
}

function goToQuestion(index) {
  AppState.currentIndex = index;
  renderQuiz();
}

function confirmSubmit() {
  const answered = Object.keys(AppState.answers).length;
  const total = AppState.questions.length;
  const unanswered = total - answered;

  if (unanswered > 0) {
    if (!confirm(`Bạn còn ${unanswered} câu chưa trả lời. Vẫn muốn nộp bài?`)) return;
  }
  submitQuiz();
}

// ====================================================
// NỘP BÀI VÀ KẾT QUẢ
// ====================================================
async function submitQuiz() {
  if (AppState.isSubmitted) return;
  AppState.isSubmitted = true;

  stopTimer();

  const questions = AppState.questions;
  const answers = AppState.answers;
  const timeTaken = Math.round((Date.now() - AppState.startTime) / 1000);

  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) correct++;
  });

  const total = questions.length;
  const score = parseFloat((correct / total * 10).toFixed(1));

  const resultData = {
    studentName: AppState.student.name,
    studentClass: AppState.student.class,
    topic: AppState.currentTopic.id,
    topicName: AppState.currentTopic.name,
    score,
    correct,
    total,
    timeTaken,
    answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])),
  };

  // Lưu kết quả
  try {
    await saveResult(resultData);
  } catch (e) {
    console.error('Lỗi lưu kết quả:', e);
  }

  renderResult(resultData, questions, answers);
  setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(); }, 150);
}

function renderResult(result, questions, answers) {
  const app = document.getElementById('app');
  if (!app) return;

  const rank = getRank(result.score);
  const grade = result.score >= 8 ? '🥇 Xuất sắc' : result.score >= 6.5 ? '🥈 Khá' : result.score >= 5 ? '🥉 Trung bình' : '❌ Chưa đạt';
  const scoreClass = result.score >= 8 ? 'high' : result.score >= 5 ? 'mid' : 'low';
  const time = `${Math.floor(result.timeTaken/60)} phút ${result.timeTaken % 60} giây`;

  app.innerHTML = `
    <div class="card mb-4">
      <div class="card-header">
        <h2>📊 Kết quả bài thi</h2>
      </div>
      <div class="card-body" style="text-align:center;">
        <div class="score-big score-${scoreClass}">${result.score}<span style="font-size:1.2rem;">/10</span></div>
        <div style="font-size:1.5rem;margin:8px 0;">${grade}</div>

        <!-- Danh hiệu -->
        <div style="margin:12px 0 6px;">
          ${renderRankBadge(result.score)}
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">
          ${rank.emoji} Danh hiệu: <strong>${rank.title}</strong>
        </div>

        <div style="color:var(--text-muted);margin-bottom:24px;font-size:0.88rem;">
          ${result.studentName} - ${result.studentClass} | ${result.topicName} | ⏱️ ${time}
        </div>
        <div class="stats-grid mb-4" style="max-width:500px;margin:0 auto;">
          <div class="stats-card"><span class="icon">✅</span><div class="info"><div class="num">${result.correct}</div><div class="lbl">Câu đúng</div></div></div>
          <div class="stats-card"><span class="icon">❌</span><div class="info"><div class="num">${result.total - result.correct}</div><div class="lbl">Câu sai</div></div></div>
          <div class="stats-card"><span class="icon">📊</span><div class="info"><div class="num">${Math.round(result.correct/result.total*100)}%</div><div class="lbl">Tỉ lệ đúng</div></div></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="location.reload()">🔄 Làm bài lại</button>
          <a href="rank.html" class="btn btn-outline">🏆 Xem bảng xếp hạng</a>
        </div>
      </div>
    </div>

    <!-- Chi tiết từng câu -->
    <div class="card">
      <div class="card-header"><h2>📝 Chi tiết từng câu</h2></div>
      <div class="card-body">
        ${questions.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = userAns === q.correct;
          const opts = ['A', 'B', 'C', 'D'];
          return `
            <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
              <div class="review-header">
                <span class="review-num">${i + 1}</span>
                <span class="review-result">${isCorrect ? '✅ Đúng' : '❌ Sai'}</span>
              </div>
              <div class="review-question">${q.text}</div>
              ${q.imageUrl ? `<div style="margin:8px 0;"><img src="${q.imageUrl}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border);"></div>` : ''}
              <div class="review-options">
                ${q.options.map((opt, j) => `
                  <div class="review-option ${j === q.correct ? 'correct-opt' : ''} ${j === userAns && !isCorrect ? 'wrong-opt' : ''}">
                    <strong>${opts[j]}.</strong> ${opt}
                    ${j === q.correct ? ' ← Đáp án đúng' : ''}
                    ${j === userAns && !isCorrect ? ' ← Bạn chọn' : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ====================================================
// TIMER
// ====================================================
function startTimer() {
  stopTimer();
  AppState.timer = setInterval(() => {
    AppState.timeLeft--;
    updateTimerDisplay();
    if (AppState.timeLeft <= 0) {
      stopTimer();
      showToast('⏰ Hết giờ! Tự động nộp bài.', 'warning', 3000);
      setTimeout(submitQuiz, 1000);
    }
  }, 1000);
}

function stopTimer() {
  if (AppState.timer) {
    clearInterval(AppState.timer);
    AppState.timer = null;
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  el.textContent = `⏱️ ${formatTime(AppState.timeLeft)}`;
  el.style.color = AppState.timeLeft < 60 ? 'var(--danger)' : '';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ====================================================
// TIỆN ÍCH
// ====================================================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ====================================================
// KHỞI ĐỘNG TRANG CHỦ
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  // Chỉ render trang chủ nếu có phần tử #app
  if (document.getElementById('app')) {
    renderHome();
  }
});
