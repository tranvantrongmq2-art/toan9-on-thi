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
  selectedLevel: null, // 'tb' | 'kha' | 'tot' | 'xs'
};

// ---- CHỦ ĐỀ ----
const TOPICS = [
  { id: 'dai-so',   name: 'Đại số',    icon: '🔢', desc: 'Phương trình, hệ phương trình, hàm số', color: '#3b82f6' },
  { id: 'hinh-hoc', name: 'Hình học',  icon: '📐', desc: 'Tam giác, đường tròn, hình không gian',  color: '#10b981' },
  { id: 'tong-hop', name: 'Tổng hợp',  icon: '📚', desc: 'Kết hợp cả đại số và hình học',  color: '#f59e0b' },
];

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

// ====================================================
// LƯU VÀ ĐỌC DỮ LIỆU XEM LẠI BÀI LÀM
// ====================================================

// Lưu review: localStorage (luôn) + Firebase (nếu có)
async function saveReview(reviewKey, reviewData) {
  // Luôn lưu local để xem ngay
  try {
    localStorage.setItem(reviewKey, JSON.stringify(reviewData));
  } catch(e) {}

  // Lưu lên Firebase để xem từ bất kỳ thiết bị nào
  if (AppState.useFirebase && AppState.db) {
    try {
      // Dùng reviewKey làm document ID (an toàn hơn)
      const safeKey = reviewKey.replace(/[^a-zA-Z0-9_]/g, '_');
      // Tách questions và answers riêng để tránh vượt giới hạn 1MB
      // Lưu metadata vào 'reviews', questions vào 'review_questions'
      const meta = {
        studentName: reviewData.studentName,
        studentClass: reviewData.studentClass,
        score: reviewData.score,
        correct: reviewData.correct,
        total: reviewData.total,
        timeTaken: reviewData.timeTaken,
        topicName: reviewData.topicName,
        level: reviewData.level || 'tb',
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        answers: reviewData.answers,
        // Lưu câu hỏi (không có imageUrl để tiết kiệm space)
        questions: reviewData.questions.map(q => ({
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation || '',
        })),
      };
      await AppState.db.collection('reviews').doc(safeKey).set(meta);
    } catch(e) {
      console.warn('Không lưu được review lên Firebase:', e.message);
    }
  }
}

// Đọc review: thử local trước, nếu không có thì thử Firebase
async function fetchReview(studentName, studentClass) {
  const reviewKey = 'review_' + studentName + '_' + studentClass;
  // Thử local trước
  try {
    const local = localStorage.getItem(reviewKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.questions) return parsed;
    }
  } catch(e) {}

  // Thử Firebase
  if (AppState.useFirebase && AppState.db) {
    try {
      const safeKey = reviewKey.replace(/[^a-zA-Z0-9_]/g, '_');
      const doc = await AppState.db.collection('reviews').doc(safeKey).get();
      if (doc.exists) {
        const data = doc.data();
        // Chuyển timestamp về string
        if (data.savedAt && data.savedAt.toDate) data.savedAt = data.savedAt.toDate().toISOString();
        // Lưu local để dùng sau
        try { localStorage.setItem(reviewKey, JSON.stringify(data)); } catch(e) {}
        return data;
      }
    } catch(e) {
      console.warn('Lỗi đọc review Firebase:', e.message);
    }
  }
  return null;
}

// Upload câu hỏi lên Firestore (legacy - dùng uploadQuestionSet thay thế)
async function uploadQuestions(questions) {
  if (AppState.useFirebase && AppState.db) {
    const batch = AppState.db.batch();
    questions.forEach(q => {
      const ref = AppState.db.collection('questions').doc();
      batch.set(ref, { ...q, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  } else {
    const allQ = JSON.parse(localStorage.getItem('quiz_questions_v2') || '{}');
    const setId = `legacy_${Date.now()}`;
    allQ[setId] = questions;
    localStorage.setItem('quiz_questions_v2', JSON.stringify(allQ));
  }
}

// Lấy câu hỏi theo chủ đề VÀ khu vực trình độ (TÁCH RIÊNG, không gộp chung)
// fetchQuestions chỉ dùng khi KHÔNG có setId (fallback câu mẫu)
// Khi đã có bộ đề upload, LUÔN dùng fetchQuestionsBySet(setId) — không gom chung
async function fetchQuestions(topic, level) {
  const lvId = level || AppState.selectedLevel || 'tb';

  // KHÔNG query Firebase gom tất cả cùng topic+level vì sẽ gộp nhiều bộ đề
  // Chỉ dùng localStorage câu mẫu hoặc dữ liệu cũ trước khi có hệ thống set

  // Thử localStorage cũ (trước khi có hệ thống set riêng biệt)
  const stored = JSON.parse(localStorage.getItem('quiz_questions') || '{}');
  if (stored[topic] && stored[topic].length > 0) return stored[topic];

  // Câu mẫu — RIÊNG BIỆT theo từng khu vực, không gộp chung
  return [];
}

// ====================================================
// HỆ THỐNG DANH HIỆU
// ====================================================
const RANK_SYSTEM = [
  {
    min: 0,   max: 4.9,
    tier: 'silver-gold',
    title: 'TÂN BINH ĐỘT KÍCH',
    icon: '🥈', cls: 'rank-silver', emoji: '🥈',
    tierLabel: 'Bạc / Vàng',
    privilege: 'Được thầy khen trước lớp vì đã vượt qua "mức liệt".',
    nextMsg: '📈 Đạt 5.0 để lên cấp CAO THỦ CASIO!',
  },
  {
    min: 5,   max: 6.4,
    tier: 'platinum',
    title: 'CAO THỦ CASIO',
    icon: '🏅', cls: 'rank-platinum', emoji: '🏅',
    tierLabel: 'Bạch Kim',
    privilege: 'Được tặng 1 sticker "Chiến binh" vào vở bài tập.',
    nextMsg: '📈 Đạt 6.5 để lên cấp CHIẾN BINH TINH NHUỆ!',
  },
  {
    min: 6.5, max: 7.9,
    tier: 'diamond',
    title: 'CHIẾN BINH TINH NHUỆ',
    icon: '💎', cls: 'rank-diamond', emoji: '💎',
    tierLabel: 'Kim Cương',
    privilege: 'Được quyền nhờ thầy giải đáp 1 câu khó bất kỳ.',
    nextMsg: '📈 Đạt 8.0 để lên cấp HUYỀN THOẠI TOÁN HỌC!',
  },
  {
    min: 8,   max: 8.9,
    tier: 'legend',
    title: 'HUYỀN THOẠI TOÁN HỌC',
    icon: '🔮', cls: 'rank-legend', emoji: '🔮',
    tierLabel: 'Huyền Thoại',
    privilege: 'Tên được in đậm, màu đỏ rực rỡ trên bảng xếp hạng.',
    nextMsg: '📈 Đạt 9.0 để lên cấp BẬC THẦY CHIẾN THUẬT!',
  },
  {
    min: 9,   max: 9.9,
    tier: 'grandmaster',
    title: 'BẬC THẦY CHIẾN THUẬT',
    icon: '👑', cls: 'rank-grandmaster', emoji: '👑',
    tierLabel: 'Đại Cao Thủ',
    privilege: 'Pháo hoa nổ tung trên Web + Tặng 1 cây bút bi xịn.',
    nextMsg: '📈 Đạt 10 điểm để trở thành TRÙM CUỐI MỸ QUÝ!',
  },
  {
    min: 10,  max: 10,
    tier: 'challenger',
    title: 'TRÙM CUỐI MỸ QUÝ',
    icon: '🔥', cls: 'rank-challenger', emoji: '🔥',
    tierLabel: 'Thách Đấu',
    privilege: 'Vinh danh trang chủ + "Phiếu miễn kiểm tra miệng".',
    nextMsg: '🏆 Em đã đạt đỉnh cao tuyệt đối! Thầy tự hào!',
  },
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
// CẤU HÌNH 4 TRÌNH ĐỘ
// ====================================================
const LEVELS = {
  tb:  { id:'tb',  name:'Trung Bình', icon:'📗', color:'#6b7280', scoreRange:'Điểm 0–5',   badge:'slb-tb',  desc:'Ôn kiến thức cơ bản',    minScore: 0   },
  kha: { id:'kha', name:'Khá',        icon:'📘', color:'#3b82f6', scoreRange:'Điểm 5–6.5', badge:'slb-kha', desc:'Luyện dạng bài trung cấp', minScore: 5   },
  tot: { id:'tot', name:'Tốt',        icon:'📙', color:'#10b981', scoreRange:'Điểm 6.5–8', badge:'slb-tot', desc:'Chinh phục bài khó',        minScore: 6.5 },
  xs:  { id:'xs',  name:'Xuất Sắc',   icon:'📕', color:'#f59e0b', scoreRange:'Điểm 8–10',  badge:'slb-xs',  desc:'Thách thức đỉnh cao',       minScore: 8   },
};
const LEVEL_ORDER = ['tb','kha','tot','xs'];

// Rank metadata per level for display in tabs
const LEVEL_RANK_META = {
  tb:  { rankIcon:'🥈', rankShort:'Tân Binh / Casio',        rankRange:'0–6.4đ' },
  kha: { rankIcon:'💎', rankShort:'Chiến Binh Tinh Nhuệ',    rankRange:'6.5–7.9đ' },
  tot: { rankIcon:'🔮', rankShort:'Huyền Thoại',             rankRange:'8–8.9đ' },
  xs:  { rankIcon:'👑', rankShort:'Đại Cao Thủ / Thách Đấu', rankRange:'9–10đ' },
};

// ====================================================
// THÔNG ĐIỆP "LẦY LỘI" CỦA THẦY
// ====================================================
const TEACHER_MSGS_CORRECT = [
  'Chuẩn luôn! Thầy đoán em đã tra Casio trước rồi phải không 😏 Làm tiếp đi nào!',
  'Ôi trời, em làm đúng! Thầy tưởng câu này sẽ "cua đường" em rồi 😄 Giỏi thật!',
  'Xuất sắc! Nếu thi thật mà cũng làm vậy, bố mẹ em sẽ khóc vì vui đó 🌟',
  'Đúng rồi! Bí quyết: học thuộc dạng này là sang câu khác em cũng làm được luôn!',
  '🎯 Bắn trúng tim rồi! Thầy tự hào lắm, tiếp tục đi chiến binh ơi!',
  'Này, em làm đúng nhanh vậy là bí quyết gì? Chia sẻ với thầy đi! 😆',
  'Mẹo Casio bài này thầy để ở file PDF nhé, xem xong đảm bảo thành "trùm" lớp ngay 😎',
];
const TEACHER_MSGS_WRONG = [
  'Hú hồn chưa, câu này suýt nữa là em đúng rồi đó! Nhìn lại đáp án xem thầy chỉ điểm thêm nhé 👆',
  'Ối, trật rồi! Nhưng không sao — thầy cũng từng sai câu tương tự hồi học cấp 2 đó 😅',
  'Câu này "bẫy" lắm em ơi! 90% học sinh chọn sai y chang em. Xem kỹ lại để lần sau "né" nhé!',
  'Sai rồi nhưng mà thầy nhận ra em đang cố đúng hướng rồi! Chỉnh lại một chút là ra thôi!',
  '❌ Lần này chưa được, nhưng chiến binh không bao giờ bỏ cuộc! Xem đáp án và chinh phục câu sau!',
  'Kiểu này thầy đoán em chưa đọc kỹ đề phải không? Đọc lại đề trước, rồi nhìn đáp án sau nhé 👀',
  'Câu này tricky lắm! Mẹo nhỏ: loại trừ đáp án sai trước, còn lại là đúng. Nhớ áp dụng nhé!',
];

function getTeacherMsg(isCorrect) {
  const arr = isCorrect ? TEACHER_MSGS_CORRECT : TEACHER_MSGS_WRONG;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ====================================================
// GIẢI THƯỞNG NỖ LỰC
// ====================================================
function checkEffortAwards(studentName, score) {
  const key = 'effort_' + studentName;
  let data = JSON.parse(localStorage.getItem(key) || '{}');
  const today = new Date().toDateString();
  const awards = [];

  // --- Giải Chiến Binh Bền Bỉ: làm bài đều đặn ---
  if (!data.dates) data.dates = [];
  if (!data.dates.includes(today)) data.dates.push(today);
  // Giữ 30 ngày gần nhất
  data.dates = data.dates.slice(-30);
  // Đếm streak (ngày liên tiếp)
  let streak = 1;
  for (let i = data.dates.length - 2; i >= 0; i--) {
    const d1 = new Date(data.dates[i + 1]);
    const d2 = new Date(data.dates[i]);
    const diff = (d1 - d2) / 86400000;
    if (diff <= 1.5) streak++;
    else break;
  }
  data.streak = streak;
  if (streak >= 3) {
    awards.push({
      type: 'streak',
      icon: '🔥',
      title: `Chiến Binh Bền Bỉ — ${streak} ngày liên tiếp!`,
      desc: 'Thầy thấy em đang siêu chăm chỉ rồi! Sự kiên trì này sẽ thắng tất cả! 💪',
    });
  }

  // --- Giải Tiến Bộ Vượt Bậc: điểm tăng so với lần trước ---
  const prevScore = data.lastScore;
  if (prevScore !== undefined && score > prevScore + 1) {
    awards.push({
      type: 'progress',
      icon: '📈',
      title: `Tiến Bộ Vượt Bậc! +${(score - prevScore).toFixed(1)} điểm!`,
      desc: `Lần trước ${prevScore} điểm, lần này ${score} điểm — Thầy đang vinh danh em ngay đây! 🎊`,
    });
  }
  data.lastScore = score;

  localStorage.setItem(key, JSON.stringify(data));
  return awards;
}


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

  app.innerHTML = `
    <!-- ===== BẢNG VINH DANH ===== -->
    <div class="home-section-label" style="margin-top:0;">🏆 Bảng Vinh Danh</div>
    <div class="honor-board" id="honorBoard">
      <div class="honor-loading"><div class="spinner"></div></div>
    </div>

    <!-- Hero banner -->
    <div class="home-hero" style="margin-top:20px;">
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

    <!-- ===== TÀI LIỆU ÔN TẬP ===== -->
    <div class="home-section-label" style="margin-top:24px;">📚 Tài Liệu Ôn Tập</div>
    <div class="doc-library" id="docLibrary">
      <div style="display:flex;justify-content:center;padding:20px;"><div class="spinner"></div></div>
    </div>

    <!-- ===== THÔNG TIN HỌC SINH ===== -->
    <div class="home-info-card" style="margin-top:24px;">
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
        <div class="home-field">
          <label>Trình độ của em</label>
          <select class="home-input" id="studentLevel" onchange="onLevelSelectChange()">
            <option value="">-- Chọn trình độ --</option>
            <option value="tb">📗 Trung Bình (0–5 điểm)</option>
            <option value="kha">📘 Khá (5–6.5 điểm)</option>
            <option value="tot">📙 Tốt (6.5–8 điểm)</option>
            <option value="xs">📕 Xuất Sắc (8–10 điểm)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ===== 4 KHU VỰC TRÌNH ĐỘ ===== -->
    <div class="home-section-label" style="margin-top:24px;">🎯 Chọn khu vực làm bài</div>

    <!-- Tab chọn khu vực -->
    <div class="level-tabs" id="levelTabs">
      ${LEVEL_ORDER.map(lvId => {
        const lv = LEVELS[lvId];
        const lvRankInfo = LEVEL_RANK_META[lvId];
        return `
          <div class="level-tab" data-level="${lvId}" onclick="switchLevel('${lvId}')">
            <div class="lv-lock" id="lvLock_${lvId}">🔒</div>
            <div class="lv-icon">${lv.icon}</div>
            <div class="lv-name" style="color:${lv.color}">${lv.name}</div>
            <div class="lv-score">${lv.scoreRange}</div>
            <div class="lv-rank-mini">${lvRankInfo.rankIcon} <span>${lvRankInfo.rankShort}</span></div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Banner kích thích cấp Trung Bình -->
    <div class="tb-motivate-banner" id="tbMotivateBanner" style="display:none;">
      <div class="tb-motivate-inner">
        <div class="tb-motivate-title">🚀 Em đang ở khu vực TRUNG BÌNH — Hãy vươn lên!</div>
        <div class="tb-motivate-path">
          ${[
            { icon:'🥈', label:'Trung Bình', sub:'0–4.9đ', cls:'step-current' },
            { icon:'🏅', label:'Bạch Kim', sub:'5–6.4đ', cls:'step-next' },
            { icon:'💎', label:'Kim Cương', sub:'6.5–7.9đ', cls:'step-future' },
            { icon:'🔮', label:'Huyền Thoại', sub:'8–8.9đ', cls:'step-future' },
            { icon:'👑', label:'Đại Cao Thủ', sub:'9–9.9đ', cls:'step-future' },
            { icon:'🔥', label:'Thách Đấu', sub:'10đ', cls:'step-future' },
          ].map((s,i) => `
            <div class="tb-step ${s.cls}">
              <div class="tb-step-icon">${s.icon}</div>
              <div class="tb-step-label">${s.label}</div>
              <div class="tb-step-sub">${s.sub}</div>
              ${i < 5 ? '<div class="tb-step-arrow">→</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="tb-motivate-rewards">
          <div class="tb-reward-item">🏅 <strong>Bạch Kim:</strong> Sticker "Chiến binh" vào vở</div>
          <div class="tb-reward-item">💎 <strong>Kim Cương:</strong> Được thầy giải 1 câu khó</div>
          <div class="tb-reward-item">👑 <strong>Đại Cao Thủ:</strong> Pháo hoa + Bút bi xịn</div>
          <div class="tb-reward-item">🔥 <strong>Thách Đấu:</strong> Phiếu miễn kiểm tra miệng!</div>
        </div>
        <div class="tb-motivate-quote">💬 <em>"Mỗi câu đúng hôm nay là một bước lên bục vinh quang ngày mai!"</em> — Thầy Trong</div>
      </div>
    </div>

    <!-- Banner kích thích cấp Khá -->
    <div class="level-motivate-banner kha-banner" id="khaMotivateBanner" style="display:none;">
      <div class="lmb-inner">
        <div class="lmb-header">
          <span class="lmb-icon">📘</span>
          <div>
            <div class="lmb-title">💪 Khu vực KHÁ — Em đang bứt phá!</div>
            <div class="lmb-sub">Điểm mục tiêu: <strong>5.0 – 6.5</strong> · Danh hiệu: 🏅 CAO THỦ CASIO</div>
          </div>
        </div>
        <div class="lmb-path">
          ${[
            { icon:'📗', label:'Trung Bình', sub:'✓ Qua rồi!', cls:'step-done' },
            { icon:'📘', label:'Khá', sub:'5–6.5đ', cls:'step-current' },
            { icon:'📙', label:'Tốt', sub:'6.5–8đ', cls:'step-next' },
            { icon:'📕', label:'Xuất Sắc', sub:'8–10đ', cls:'step-future' },
          ].map((s,i,arr) => `
            <div class="tb-step ${s.cls}">
              <div class="tb-step-icon">${s.icon}</div>
              <div class="tb-step-label">${s.label}</div>
              <div class="tb-step-sub">${s.sub}</div>
              ${i < arr.length-1 ? '<div class="tb-step-arrow">→</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="lmb-tips">
          <div class="lmb-tip">🧩 Luyện bài trung cấp: phương trình bậc 2, tam giác đồng dạng</div>
          <div class="lmb-tip">⏱️ Tập làm bài trong thời gian quy định để quen với áp lực thi</div>
          <div class="lmb-tip">🏅 Đạt 6.5+ → Được thầy giải 1 câu khó bất kỳ em muốn!</div>
        </div>
        <div class="lmb-quote">💬 <em>"Khá rồi nhưng đừng dừng ở đây — đỉnh cao còn ở phía trước!"</em> — Thầy Trong</div>
      </div>
    </div>

    <!-- Banner kích thích cấp Tốt -->
    <div class="level-motivate-banner tot-banner" id="totMotivateBanner" style="display:none;">
      <div class="lmb-inner">
        <div class="lmb-header">
          <span class="lmb-icon">📙</span>
          <div>
            <div class="lmb-title">🔥 Khu vực TỐT — Chiến binh tinh nhuệ!</div>
            <div class="lmb-sub">Điểm mục tiêu: <strong>6.5 – 8.0</strong> · Danh hiệu: 💎 CHIẾN BINH TINH NHUỆ</div>
          </div>
        </div>
        <div class="lmb-path">
          ${[
            { icon:'📗', label:'Trung Bình', sub:'✓', cls:'step-done' },
            { icon:'📘', label:'Khá', sub:'✓', cls:'step-done' },
            { icon:'📙', label:'Tốt', sub:'6.5–8đ', cls:'step-current' },
            { icon:'📕', label:'Xuất Sắc', sub:'8–10đ', cls:'step-next' },
          ].map((s,i,arr) => `
            <div class="tb-step ${s.cls}">
              <div class="tb-step-icon">${s.icon}</div>
              <div class="tb-step-label">${s.label}</div>
              <div class="tb-step-sub">${s.sub}</div>
              ${i < arr.length-1 ? '<div class="tb-step-arrow">→</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="lmb-tips">
          <div class="lmb-tip">🏆 Thử sức với bài toán tổng hợp, kết hợp nhiều kiến thức</div>
          <div class="lmb-tip">📐 Rèn kỹ năng vẽ hình và phân tích bài hình học phức tạp</div>
          <div class="lmb-tip">💎 Đạt 8.0+ → Tên được in đậm, màu đỏ rực rỡ trên bảng xếp hạng!</div>
        </div>
        <div class="lmb-quote">💬 <em>"Người giỏi không phải người không sai — mà là người học từ cái sai!"</em> — Thầy Trong</div>
      </div>
    </div>

    <!-- Banner kích thích cấp Xuất Sắc -->
    <div class="level-motivate-banner xs-banner" id="xsMotivateBanner" style="display:none;">
      <div class="lmb-inner">
        <div class="lmb-header">
          <span class="lmb-icon">📕</span>
          <div>
            <div class="lmb-title">👑 Khu vực XUẤT SẮC — Đỉnh cao thách đấu!</div>
            <div class="lmb-sub">Điểm mục tiêu: <strong>8.0 – 10</strong> · Danh hiệu: 👑 BẬC THẦY → 🔥 TRÙM CUỐI</div>
          </div>
        </div>
        <div class="lmb-path">
          ${[
            { icon:'📗', label:'TB', sub:'✓', cls:'step-done' },
            { icon:'📘', label:'Khá', sub:'✓', cls:'step-done' },
            { icon:'📙', label:'Tốt', sub:'✓', cls:'step-done' },
            { icon:'📕', label:'Xuất Sắc', sub:'8–10đ', cls:'step-current' },
            { icon:'🔥', label:'TRÙM CUỐI', sub:'10đ !!', cls:'step-next' },
          ].map((s,i,arr) => `
            <div class="tb-step ${s.cls}">
              <div class="tb-step-icon">${s.icon}</div>
              <div class="tb-step-label">${s.label}</div>
              <div class="tb-step-sub">${s.sub}</div>
              ${i < arr.length-1 ? '<div class="tb-step-arrow">→</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="lmb-tips">
          <div class="lmb-tip">🧠 Ôn các bài "bẫy" — đề thi lớp 10 luôn có câu phân loại cực khó</div>
          <div class="lmb-tip">⚡ Luyện tốc độ: hoàn thành bài trong 2/3 thời gian để kiểm tra lại</div>
          <div class="lmb-tip">🔥 Đạt 10 điểm → Vinh danh trang chủ + Phiếu miễn kiểm tra miệng!</div>
        </div>
        <div class="lmb-quote">💬 <em>"Em đã ở đỉnh rồi — nhiệm vụ bây giờ là giữ vững và truyền cảm hứng cho bạn bè!"</em> — Thầy Trong</div>
      </div>
    </div>

    <!-- Khu vực bộ đề theo level -->
    <div class="level-sets-area card" id="levelSetsArea" style="padding:20px;">
      <div style="text-align:center;color:var(--text-muted);padding:24px 0;">
        👆 Chọn trình độ của em ở trên trước nhé!
      </div>
    </div>
  `;

  setTimeout(() => { loadSetList(); loadHonorBoard(); loadDocLibrary(); }, 800);
}

// Khi học sinh đổi select trình độ
function onLevelSelectChange() {
  const val = document.getElementById('studentLevel').value;
  if (val) switchLevel(val);
}

// Chuyển tab level
function switchLevel(lvId) {
  const lv = LEVELS[lvId];
  if (!lv) return;

  // Kiểm tra học sinh đã nhập tên chưa
  const nameInput = document.getElementById('studentName');
  const name = nameInput ? nameInput.value.trim() : '';

  // Sync select
  const sel = document.getElementById('studentLevel');
  if (sel) sel.value = lvId;

  // Highlight tab
  document.querySelectorAll('.level-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.level === lvId);
  });

  AppState.selectedLevel = lvId;

  // Update lock icons — học sinh chỉ được vào đúng trình độ của mình
  updateLockIcons(lvId);

  // Show/hide level motivate banners
  const tbBanner = document.getElementById('tbMotivateBanner');
  if (tbBanner) tbBanner.style.display = (lvId === 'tb') ? '' : 'none';
  const khaBanner = document.getElementById('khaMotivateBanner');
  if (khaBanner) khaBanner.style.display = (lvId === 'kha') ? '' : 'none';
  const totBanner = document.getElementById('totMotivateBanner');
  if (totBanner) totBanner.style.display = (lvId === 'tot') ? '' : 'none';
  const xsBanner = document.getElementById('xsMotivateBanner');
  if (xsBanner) xsBanner.style.display = (lvId === 'xs') ? '' : 'none';

  // Hiển thị bộ đề của khu vực đó
  renderLevelSets(lvId);
}

function updateLockIcons(selectedLvId) {
  LEVEL_ORDER.forEach(id => {
    const el = document.getElementById('lvLock_' + id);
    if (!el) return;
    el.textContent = id === selectedLvId ? '✅' : '🔒';
  });
}

async function renderLevelSets(lvId) {
  const area = document.getElementById('levelSetsArea');
  if (!area) return;
  const lv = LEVELS[lvId];

  // Học sinh chỉ thấy bộ đề của đúng trình độ mình
  area.innerHTML = `<div style="display:flex;justify-content:center;padding:20px;"><div class="spinner"></div></div>`;

  let sets = [];
  try {
    if (AppState.useFirebase && AppState.db) {
      // KHÔNG dùng orderBy để tránh lỗi composite index chưa tạo
      // Lọc level ở server, sort uploadedAt ở client
      const snap = await AppState.db.collection('question_sets')
        .where('level', '==', lvId)
        .get();
      sets = snap.docs.map(d => {
        const data = d.data();
        // Chuyển Firestore Timestamp → ISO string
        const uploadedAt = data.uploadedAt?.toDate?.()?.toISOString?.() || data.uploadedAt || '';
        return { ...data, uploadedAt };
      });
      // Sort mới nhất trước (client-side)
      sets.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      console.log(`✅ Firebase sets level=${lvId}:`, sets.length, sets.map(s => s.setName));
    } else {
      const stored = JSON.parse(localStorage.getItem('question_sets') || '{}');
      sets = Object.values(stored)
        .filter(s => (s.level || 'tb') === lvId)
        .sort((a,b) => (b.uploadedAt||'').localeCompare(a.uploadedAt||''));
      console.log(`✅ localStorage sets level=${lvId}:`, sets.length, sets.map(s => s.setName));
    }
  } catch(e) {
    console.error('❌ Lỗi tải danh sách bộ đề:', e.message || e);
    // Fallback 1: đọc tất cả question_sets không filter (tránh lỗi index)
    try {
      if (AppState.useFirebase && AppState.db) {
        const snap2 = await AppState.db.collection('question_sets').get();
        sets = snap2.docs.map(d => {
          const data = d.data();
          const uploadedAt = data.uploadedAt?.toDate?.()?.toISOString?.() || data.uploadedAt || '';
          return { ...data, uploadedAt };
        }).filter(s => (s.level || 'tb') === lvId);
        sets.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        console.log(`✅ Fallback Firebase sets:`, sets.length);
      }
    } catch(e2) {
      console.error('❌ Fallback Firebase cũng lỗi:', e2.message);
      // Fallback 2: dùng localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('question_sets') || '{}');
        sets = Object.values(stored)
          .filter(s => (s.level || 'tb') === lvId)
          .sort((a,b) => (b.uploadedAt||'').localeCompare(a.uploadedAt||''));
        console.log(`✅ Fallback localStorage sets:`, sets.length);
      } catch(e3) { sets = []; }
    }
  }

  // Lọc thêm: bỏ bộ đề bị khoá
  sets = sets.filter(s => !s.locked);

  if (sets.length === 0) {
    area.innerHTML = `
      <div style="text-align:center;padding:48px 20px;">
        <div style="font-size:3rem;margin-bottom:14px;">📭</div>
        <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:8px;">
          ${lv.icon || ''} Khu vực ${lv.name || lvId}
        </div>
        <div style="font-size:0.88rem;color:var(--text-muted);">
          Thầy chưa upload đề thi cho khu vực này.<br>Hãy quay lại sau nhé! 💪
        </div>
      </div>`;
    return;
  }


  // Hiển thị TỪNG bộ đề riêng biệt — KHÔNG gom chung, dù cùng topic
  // Mỗi set là 1 card độc lập với setId riêng
  let html = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="set-level-badge ${lv.badge}" style="font-size:0.85rem;padding:4px 14px;">${lv.icon} Khu vực ${lv.name}</span>
      <span style="font-size:0.82rem;color:var(--text-muted);">${lv.scoreRange} · ${lv.desc}</span>
      <span style="font-size:0.78rem;background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:2px 10px;border-radius:20px;">
        📋 ${sets.length} bộ đề
      </span>
    </div>
    <div class="home-topics">`;

  // Lưu sets vào map toàn cục để lookup khi click (tránh lỗi escape trong onclick)
  window._levelSetsMap = window._levelSetsMap || {};
  sets.forEach(s => {
    window._levelSetsMap[s.setId] = s;
    const ts = TOPIC_STYLES[s.topic] || TOPIC_STYLES['tong-hop'];
    const uploadDate = s.uploadedAt ? new Date(s.uploadedAt).toLocaleDateString('vi-VN') : '';
    const safeSetId = encodeURIComponent(s.setId);
    html += `
      <div class="home-topic-card set-card-individual"
           data-setid="${safeSetId}"
           data-topic="${s.topic || 'tong-hop'}"
           data-level="${lvId}"
           style="--tgrad:${ts.grad};--tshadow:${ts.shadow};cursor:pointer;">
        <div class="htc-glyph">${ts.glyph}</div>
        <div class="htc-body">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:1.1rem;">${ts.icon}</span>
            <span style="font-size:0.65rem;background:rgba(255,255,255,0.25);padding:1px 7px;border-radius:10px;font-weight:700;letter-spacing:.04em;">
              ${(TOPIC_NAMES[s.topic]||s.topic||'Tổng hợp').toUpperCase()}
            </span>
          </div>
          <div class="htc-name" style="font-size:0.92rem;line-height:1.35;">${s.setName}</div>
          <div class="htc-desc" style="margin-top:4px;">
            📝 ${s.count||'?'} câu hỏi
            ${uploadDate ? `· 📅 ${uploadDate}` : ''}
          </div>
        </div>
        <div class="htc-footer">
          <span style="font-size:0.72rem;opacity:0.85;margin-bottom:4px;display:block;">Bấm để làm bài</span>
          <span class="htc-arrow">→</span>
        </div>
      </div>`;
  });

  html += `</div>`;
  area.innerHTML = html;

  // Gắn event listener sau khi render — dùng data-attribute để tránh lỗi escape
  area.querySelectorAll('.set-card-individual[data-setid]').forEach(card => {
    card.addEventListener('click', () => {
      const setId = decodeURIComponent(card.dataset.setid);
      const topic = card.dataset.topic;
      const level = card.dataset.level;
      console.log('🎯 Click set card:', setId, topic, level);
      selectSet(setId, topic, level);
    });
  });
}



// ====================================================
// THƯ VIỆN TÀI LIỆU ÔN TẬP
// ====================================================
async function loadDocLibrary() {
  const el = document.getElementById('docLibrary');
  if (!el) return;

  // Luon doc tu localStorage vi file base64 khong duoc luu len Firestore
  let docs = [];
  try {
    docs = JSON.parse(localStorage.getItem('study_docs') || '[]');
  } catch(e) { docs = []; }

  if (docs.length === 0) {
    el.innerHTML = `
      <div class="doc-empty">
        <div style="font-size:2.5rem;margin-bottom:8px;">📂</div>
        <p>Thầy chưa upload tài liệu nào. Hãy học bài và chờ tài liệu mới nhé! 😊</p>
      </div>`;
    return;
  }

  const topicLabel = { 'dai-so': '🔢 Đại số', 'hinh-hoc': '📐 Hình học', 'tong-hop': '📚 Tổng hợp' };
  el.innerHTML = `
    <div class="doc-grid">
      ${docs.map(doc => `
        <div class="doc-card">
          <div class="doc-card-icon">${doc.type === 'pdf' ? '📄' : doc.type === 'image' ? '🖼️' : '📝'}</div>
          <div class="doc-card-body">
            <div class="doc-card-title">${doc.title}</div>
            <div class="doc-card-meta">
              <span class="doc-tag">${topicLabel[doc.topic] || '📚 Tổng hợp'}</span>
              ${doc.hasFormula ? '<span class="doc-tag doc-tag-math">∑ Công thức</span>' : ''}
              ${doc.hasImage ? '<span class="doc-tag doc-tag-img">🖼️ Hình ảnh</span>' : ''}
            </div>
            ${doc.description ? `<div class="doc-card-desc">${doc.description}</div>` : ''}
          </div>
          <a href="${doc.fileUrl}" download="${doc.title}" class="btn btn-primary btn-sm doc-dl-btn" target="_blank">
            ⬇️ Tải về
          </a>
        </div>
      `).join('')}
    </div>
  `;
}

// Màu theo chủ đề
const TOPIC_STYLES = {
  'dai-so':   { grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', shadow: 'rgba(99,102,241,0.35)', glyph: '∑', icon: '🔢' },
  'hinh-hoc': { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', shadow: 'rgba(16,185,129,0.35)', glyph: '△', icon: '📐' },
  'tong-hop': { grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', shadow: 'rgba(239,68,68,0.35)',  glyph: '∞', icon: '📚' },
};
const TOPIC_NAMES = { 'dai-so': 'Đại số', 'hinh-hoc': 'Hình học', 'tong-hop': 'Tổng hợp' };

async function loadSetList() {
  const el = document.getElementById('setList');
  if (!el) return;

  let sets = [];

  try {
    if (AppState.useFirebase && AppState.db) {
      // Không dùng orderBy để tránh lỗi composite index
      const snap = await AppState.db.collection('question_sets').get();
      sets = snap.docs.map(d => {
        const data = d.data();
        const uploadedAt = data.uploadedAt?.toDate?.()?.toISOString?.() || data.uploadedAt || '';
        return { ...data, uploadedAt };
      });
      sets.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } else {
      const stored = JSON.parse(localStorage.getItem('question_sets') || '{}');
      sets = Object.values(stored).sort((a,b) => (b.uploadedAt||'').localeCompare(a.uploadedAt||''));
    }
  } catch(e) {
    console.error('loadSetList error:', e);
    sets = [];
  }

  if (sets.length === 0) {
    // Không có bộ đề nào → hiện topic mẫu như cũ
    const topicStyles = [
      { grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', shadow: 'rgba(99,102,241,0.35)', glyph: '∑' },
      { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', shadow: 'rgba(16,185,129,0.35)', glyph: '△' },
      { grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', shadow: 'rgba(239,68,68,0.35)',  glyph: '∞' },
    ];
    el.innerHTML = `
      <div class="home-topics">
        ${TOPICS.map((t, i) => `
          <div class="home-topic-card" onclick="selectSet(null,'${t.id}')"
               style="--tgrad:${topicStyles[i].grad};--tshadow:${topicStyles[i].shadow}">
            <div class="htc-glyph">${topicStyles[i].glyph}</div>
            <div class="htc-body">
              <div class="htc-icon">${t.icon}</div>
              <div class="htc-name">${t.name}</div>
              <div class="htc-desc">${t.desc}</div>
            </div>
            <div class="htc-footer"><span class="htc-arrow">→</span></div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  // Hiển thị TỪNG bộ đề riêng biệt — không gom theo topic
  const LEVEL_LABELS = { tb:'📗 TB', kha:'📘 Khá', tot:'📙 Tốt', xs:'📕 XS' };
  let html = `<div class="home-topics">`;
  sets.forEach(s => {
    const ts = TOPIC_STYLES[s.topic] || TOPIC_STYLES['tong-hop'];
    const lvLabel = LEVEL_LABELS[s.level || 'tb'] || '📗 TB';
    const uploadDate = s.uploadedAt ? new Date(s.uploadedAt).toLocaleDateString('vi-VN') : '';
    const safeSetId = encodeURIComponent(s.setId);
    html += `
      <div class="home-topic-card set-card-individual"
           data-setid="${safeSetId}"
           data-topic="${s.topic || 'tong-hop'}"
           data-level="${s.level || 'tb'}"
           style="--tgrad:${ts.grad};--tshadow:${ts.shadow};cursor:pointer;">
        <div class="htc-glyph">${ts.glyph}</div>
        <div class="htc-body">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
            <span style="font-size:0.95rem;">${ts.icon}</span>
            <span style="font-size:0.6rem;background:rgba(255,255,255,0.25);padding:1px 6px;border-radius:8px;font-weight:700;">${lvLabel}</span>
            <span style="font-size:0.6rem;background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:8px;">${(TOPIC_NAMES[s.topic]||'Tổng hợp').toUpperCase()}</span>
          </div>
          <div class="htc-name" style="font-size:0.9rem;line-height:1.3;">${s.setName}</div>
          <div class="htc-desc" style="margin-top:4px;">📝 ${s.count||'?'} câu${uploadDate ? ' · 📅 '+uploadDate : ''}</div>
        </div>
        <div class="htc-footer"><span class="htc-arrow">→</span></div>
      </div>`;
  });
  html += `</div>`;
  el.innerHTML = html;

  // Gắn event listener sau khi render
  el.querySelectorAll('.set-card-individual[data-setid]').forEach(card => {
    card.addEventListener('click', () => {
      const setId = decodeURIComponent(card.dataset.setid);
      const topic = card.dataset.topic;
      const level = card.dataset.level;
      console.log('🎯 loadSetList click:', setId, topic, level);
      selectSet(setId, topic, level);
    });
  });
}

// Chọn bộ đề cụ thể
async function selectSet(setId, topicId, levelId) {
  const nameInput = document.getElementById('studentName');
  const classInput = document.getElementById('studentClass');
  const levelSelect = document.getElementById('studentLevel');

  if (!nameInput || nameInput.value.trim().length < 2) {
    showToast('Vui lòng nhập họ tên (ít nhất 2 ký tự)!', 'warning');
    nameInput && nameInput.focus();
    return;
  }

  const lvId = levelId || AppState.selectedLevel || (levelSelect && levelSelect.value) || 'tb';
  if (!lvId) {
    showToast('Vui lòng chọn trình độ của em!', 'warning');
    return;
  }

  const classVal = (classInput ? classInput.value.trim() : '') || '9?';
  AppState.student = { name: nameInput.value.trim(), class: classVal, level: lvId };
  AppState.currentTopic = TOPICS.find(t => t.id === topicId) || { id: topicId, name: TOPIC_NAMES[topicId] || topicId, icon: '📚' };
  AppState.selectedLevel = lvId;

  showWelcomeBanner(AppState.student.name);
  showToast('Đang tải câu hỏi...', 'info', 1500);

  try {
    let questions;
    if (setId) {
      // Luôn lấy đúng bộ đề theo setId — KHÔNG gom với bộ đề khác
      questions = await fetchQuestionsBySet(setId);
      if (questions.length === 0) {
        // Thử thêm 1 lần từ Firebase không dùng cache
        if (AppState.useFirebase && AppState.db) {
          try {
            const retry = await AppState.db.collection('questions')
              .where('setId','==',setId).get();
            if (!retry.empty) questions = retry.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch(e) {}
        }
      }
      if (questions.length === 0) {
        showToast('❌ Bộ đề chưa có câu hỏi hoặc đang tải! Thử lại sau vài giây.', 'error', 4000);
        console.error('❌ Không tìm thấy câu nào cho setId:', setId);
        return;
      }
    } else {
      // Không có setId → dùng câu mẫu theo khu vực
      questions = await fetchQuestions(topicId, lvId);
      if (questions.length === 0) {
        showToast('Không có câu hỏi mẫu cho chủ đề này!', 'error');
        return;
      }
    }

    // Lưu thông tin bộ đề đang làm
    AppState.currentSetId = setId || null;

    questions = shuffleArray(questions);

    AppState.questions = questions;
    AppState.currentIndex = 0;
    AppState.answers = {};
    AppState.isSubmitted = false;
    AppState.totalTime = Math.max(questions.length * 120, 600);
    AppState.timeLeft = AppState.totalTime;
    AppState.startTime = Date.now();

    renderQuiz();
    startTimer();
    setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(); }, 100);

  } catch (error) {
    showToast('Lỗi tải câu hỏi: ' + error.message, 'error');
  }
}

// Đọc câu hỏi theo setId cụ thể
async function fetchQuestionsBySet(setId) {
  if (!setId) {
    console.warn('⚠️ fetchQuestionsBySet: setId rỗng!');
    return [];
  }
  console.log('🔍 fetchQuestionsBySet:', setId);

  if (AppState.useFirebase && AppState.db) {
    try {
      const snap = await AppState.db.collection('questions').where('setId','==',setId).get();
      console.log(`📦 Firebase questions cho set "${setId}":`, snap.size);
      if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Firebase trả về rỗng → thử localStorage
      console.warn('⚠️ Firebase trả về 0 câu, thử localStorage...');
    } catch(e) {
      console.error('❌ Lỗi Firebase fetchQuestionsBySet:', e.message);
    }
  }

  // localStorage fallback — key là setId
  const allQ = JSON.parse(localStorage.getItem('quiz_questions_v2') || '{}');
  const localQuestions = allQ[setId] || [];
  console.log(`📦 localStorage questions cho set "${setId}":`, localQuestions.length);

  if (localQuestions.length === 0) {
    // Debug: in ra tất cả keys đang có
    console.warn('⚠️ Không tìm thấy set. Các setId đang có:', Object.keys(allQ));
  }

  return localQuestions;
}

// Chọn chủ đề (giữ lại để tương thích)
async function selectTopic(topicId) {
  return selectSet(null, topicId);
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
    // Không tự động chuyển câu khi sai — học sinh đọc giải thích rồi tự bấm tiếp
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

  // Lời nhắn của thầy: ưu tiên hiện q.explanation (lời giải thích đáp án đúng do GV soạn),
  // nếu không có thì dùng lời nhắn tự động "lầy lội".
  // Khi đúng: bấm "Tiếp tục →" → chuyển câu. Khi sai: bấm "Đóng" → chỉ đóng.
  const msgId = 'teacherMsg_' + AppState.currentIndex;

  // Nội dung lời nhắn
  let msgContent;
  if (q.explanation) {
    msgContent = `
      <div class="tmsg-explain-body">
        <span class="teacher-avatar">👨‍🏫</span>
        <div>
          <div class="tmsg-explain-label">💡 Thầy giải thích đáp án ${isCorrect ? 'đúng' : `đúng (${['A','B','C','D'][q.correct]}. ${q.options[q.correct]})`}:</div>
          <div class="tmsg-explain-text">${q.explanation}</div>
        </div>
      </div>`;
  } else {
    const autoMsg = getTeacherMsg(isCorrect);
    msgContent = `
      <div class="tmsg-auto-body">
        <span class="teacher-avatar">👨‍🏫</span>
        <span><strong>Thầy nhắn:</strong> ${autoMsg}</span>
      </div>`;
  }

  const teacherHtml = `
    <div class="teacher-msg-box ${isCorrect ? 'correct-msg' : 'wrong-msg'}" id="${msgId}" style="position:relative;">
      <button class="tmsg-close-x" onclick="closeTeacherMsgAndAdvance('${msgId}')" title="Đóng và sang câu tiếp">✕</button>
      ${msgContent}
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
      ${teacherHtml}
    </div>
  `;
}



// Đóng lời nhắn đúng và chuyển câu tiếp
function closeTeacherMsgAndAdvance(msgId) {
  const el = document.getElementById(msgId);
  if (el) el.style.display = 'none';
  const idx = msgId.replace('teacherMsg_', '');
  if (window._teacherMsgTimers && window._teacherMsgTimers[idx]) {
    clearInterval(window._teacherMsgTimers[idx]);
    delete window._teacherMsgTimers[idx];
  }
  if (AppState.currentIndex < AppState.questions.length - 1) nextQuestion();
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
    level: AppState.selectedLevel || 'tb',
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

  // Lưu snapshot câu hỏi vào localStorage VÀ Firebase để xem lại từ bất kỳ thiết bị
  try {
    const reviewKey = 'review_' + AppState.student.name + '_' + AppState.student.class;
    const reviewData = {
      studentName: AppState.student.name,
      studentClass: AppState.student.class,
      level: AppState.selectedLevel || 'tb',
      score, correct, total, timeTaken,
      topicName: AppState.currentTopic.name,
      savedAt: new Date().toISOString(),
      questions: questions.map(q => ({
        text: q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || '',
        imageUrl: q.imageUrl || '',
      })),
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])),
    };
    await saveReview(reviewKey, reviewData);
  } catch(e) { console.warn('Lỗi lưu review:', e); }

  renderResult(resultData, questions, answers);
  setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(); }, 150);
}

// ====================================================
// LỜI KHUYÊN THEO KHU VỰC ĐIỂM
// ====================================================
function renderLevelAdvice(score) {
  let cfg;
  if (score < 5) {
    cfg = {
      cls: 'advice-tb',
      icon: '📗',
      title: 'Khu vực Trung Bình — Em đang xây nền tảng!',
      color: '#4b5563',
      bg: 'linear-gradient(135deg,#f9fafb,#f3f4f6)',
      border: '#9ca3af',
      tips: [
        '📌 Ôn lại công thức cơ bản trước khi làm bài tiếp theo.',
        '🔁 Làm lại những câu sai để hiểu rõ lỗi sai của mình.',
        '⏰ Dành ít nhất 20 phút/ngày để luyện tập đều đặn.',
        '💬 Hỏi thầy ngay khi có câu nào không hiểu — đừng bỏ qua!',
      ],
      next: '🎯 Mục tiêu: Đạt 5.0+ để lên Khu vực Khá!',
    };
  } else if (score < 6.5) {
    cfg = {
      cls: 'advice-kha',
      icon: '📘',
      title: 'Khu vực Khá — Em đang tiến bộ rõ rệt!',
      color: '#1d4ed8',
      bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
      border: '#3b82f6',
      tips: [
        '🧩 Luyện thêm các dạng bài trung cấp: phương trình bậc 2, tam giác đồng dạng.',
        '⏱️ Tập làm bài nhanh hơn — thi thật không có nhiều thời gian đâu nhé!',
        '📐 Vẽ hình cẩn thận khi làm bài hình học, tránh nhầm dữ kiện.',
        '🔍 Kiểm tra lại bài sau khi làm — tránh sai do bất cẩn.',
      ],
      next: '🎯 Mục tiêu: Đạt 6.5+ để lên Khu vực Tốt!',
    };
  } else if (score < 8) {
    cfg = {
      cls: 'advice-tot',
      icon: '📙',
      title: 'Khu vực Tốt — Em đang chinh phục bài khó!',
      color: '#065f46',
      bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
      border: '#10b981',
      tips: [
        '🏆 Thử thách bản thân với các bài toán có lời văn phức tạp.',
        '🎯 Rèn kỹ năng phân tích đề — đọc kỹ trước khi chọn đáp án.',
        '📊 Luyện các dạng bài tổng hợp kết hợp đại số và hình học.',
        '⚡ Tăng tốc độ làm bài — mục tiêu hoàn thành trong 3/4 thời gian.',
      ],
      next: '🎯 Mục tiêu: Đạt 8.0+ để lên Khu vực Xuất Sắc!',
    };
  } else {
    cfg = {
      cls: 'advice-xs',
      icon: '📕',
      title: 'Khu vực Xuất Sắc — Em là chiến binh đỉnh cao!',
      color: '#92400e',
      bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
      border: '#f59e0b',
      tips: [
        '👑 Ôn tập các dạng bài "bẫy" — đề thi lớp 10 thường có 1-2 câu cực khó.',
        '🧠 Luyện tư duy phản biện: tại sao đáp án sai lại sai?',
        '🎓 Hỗ trợ bạn bè cùng lớp — dạy người khác là cách học tốt nhất!',
        '🔥 Giữ vững phong độ, đừng chủ quan — ôn đều đặn mỗi ngày!',
      ],
      next: score >= 10 ? '🏆 Em đã đạt đỉnh cao tuyệt đối — Thầy cực kỳ tự hào!' : '🎯 Mục tiêu: Giữ vững và chinh phục điểm 10 tuyệt đối!',
    };
  }

  return `
    <div class="level-advice-box" style="background:${cfg.bg};border:2px solid ${cfg.border};color:${cfg.color};">
      <div class="level-advice-title">${cfg.icon} ${cfg.title}</div>
      <ul class="level-advice-tips">
        ${cfg.tips.map(t => `<li>${t}</li>`).join('')}
      </ul>
      <div class="level-advice-next">${cfg.next}</div>
    </div>
  `;
}

// Toggle xem lại bài làm
function toggleReview() {
  const section = document.getElementById('reviewSection');
  if (!section) return;
  const isHidden = section.style.display === 'none';
  section.style.display = isHidden ? '' : 'none';
  if (isHidden) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([section]); }, 150);
  }
}

// Lọc câu đúng/sai trong phần xem lại
function filterReview(type) {
  const items = document.querySelectorAll('.review-item');
  items.forEach(item => {
    const isCorrect = item.dataset.correct === 'true';
    if (type === 'all') item.style.display = '';
    else if (type === 'wrong') item.style.display = isCorrect ? 'none' : '';
    else if (type === 'correct') item.style.display = isCorrect ? '' : 'none';
  });
  // Highlight active filter btn
  ['filterAll','filterWrong','filterCorrect'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.fontWeight = (id === 'filter' + type.charAt(0).toUpperCase() + type.slice(1)) ? '800' : '';
  });
}

function renderResult(result, questions, answers) {
  const app = document.getElementById('app');
  if (!app) return;

  const rank = getRank(result.score);
  const grade = result.score >= 9 ? '👑 Đại Cao Thủ' : result.score >= 8 ? '🔮 Huyền Thoại' : result.score >= 6.5 ? '💎 Chiến Binh' : result.score >= 5 ? '🏅 Bạch Kim' : '🥈 Tân Binh';
  const scoreClass = result.score >= 8 ? 'high' : result.score >= 5 ? 'mid' : 'low';
  const time = `${Math.floor(result.timeTaken/60)} phút ${result.timeTaken % 60} giây`;

  // Kiểm tra giải nỗ lực
  const effortAwards = checkEffortAwards(result.studentName, result.score);
  const effortHtml = effortAwards.length > 0 ? `
    <div class="effort-awards">
      ${effortAwards.map(a => `
        <div class="effort-award-card ${a.type}">
          <div class="effort-award-icon">${a.icon}</div>
          <div class="effort-award-body">
            <div class="effort-award-title">🏅 ${a.title}</div>
            <div class="effort-award-desc">${a.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>` : '';

  const lv = LEVELS[result.level || 'tb'] || LEVELS.tb;

  app.innerHTML = `
    <div class="card mb-4">
      <div class="card-header">
        <h2>📊 Kết quả bài thi</h2>
      </div>
      <div class="card-body" style="text-align:center;">
        <div class="score-big score-${scoreClass}">${result.score}<span style="font-size:1.2rem;">/10</span></div>
        <div style="font-size:1.5rem;margin:8px 0;">${grade}</div>

        <!-- Danh hiệu + trình độ -->
        <div style="margin:12px 0 6px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;">
          ${renderRankBadge(result.score)}
          <span class="set-level-badge ${lv.badge}">${lv.icon} Khu vực ${lv.name}</span>
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">
          ${rank.emoji} Danh hiệu: <strong>${rank.title}</strong> — <em>${rank.tierLabel}</em>
        </div>

        <!-- Đặc quyền từ thầy -->
        <div class="rank-privilege-box rank-privilege-${rank.tier}">
          <div class="rank-privilege-label">🎁 Đặc quyền từ Thầy Trong</div>
          <div class="rank-privilege-text">${rank.privilege}</div>
        </div>

        <!-- Kích thích lên cấp -->
        ${result.score < 10 ? `
        <div class="rank-nextlevel-box">
          <div class="rank-nextlevel-text">${rank.nextMsg}</div>
        </div>` : ''}

        <div style="color:var(--text-muted);margin-bottom:16px;font-size:0.88rem;">
          ${result.studentName} - ${result.studentClass} | ${result.topicName} | ⏱️ ${time}
        </div>

        ${effortHtml}

        <div class="stats-grid mb-4" style="max-width:500px;margin:16px auto 0;">
          <div class="stats-card"><span class="icon">✅</span><div class="info"><div class="num">${result.correct}</div><div class="lbl">Câu đúng</div></div></div>
          <div class="stats-card"><span class="icon">❌</span><div class="info"><div class="num">${result.total - result.correct}</div><div class="lbl">Câu sai</div></div></div>
          <div class="stats-card"><span class="icon">📊</span><div class="info"><div class="num">${Math.round(result.correct/result.total*100)}%</div><div class="lbl">Tỉ lệ đúng</div></div></div>
        </div>
        <!-- Lời khuyên theo khu vực -->
        ${renderLevelAdvice(result.score)}

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-primary" onclick="location.reload()">🔄 Làm bài lại</button>
          <button class="btn btn-review" onclick="toggleReview()">📋 Xem lại bài làm</button>
          <a href="rank.html" class="btn btn-outline">🏆 Xem bảng xếp hạng</a>
        </div>
      </div>
    </div>

    <!-- Chi tiết từng câu - ẩn mặc định, bấm nút mới mở -->
    <div class="card" id="reviewSection" style="display:none;">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <h2>📝 Xem lại bài làm</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="filterReview('all')" id="filterAll">📋 Tất cả (${questions.length})</button>
          <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1.5px solid #f87171;" onclick="filterReview('wrong')" id="filterWrong">❌ Câu sai (${questions.filter((q,i)=>answers[i]!==q.correct).length})</button>
          <button class="btn btn-sm" style="background:#dcfce7;color:#14532d;border:1.5px solid #4ade80;" onclick="filterReview('correct')" id="filterCorrect">✅ Câu đúng (${questions.filter((q,i)=>answers[i]===q.correct).length})</button>
        </div>
      </div>
      <div class="card-body" id="reviewBody">
        ${questions.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = userAns === q.correct;
          const opts = ['A', 'B', 'C', 'D'];
          return `
            <div class="review-item ${isCorrect ? 'correct' : 'wrong'}" data-correct="${isCorrect}">
              <div class="review-header">
                <span class="review-num">${i + 1}</span>
                <span class="review-result">${isCorrect ? '✅ Đúng' : '❌ Sai — cần ôn lại!'}</span>
              </div>
              <div class="review-question">${q.text}</div>
              ${q.imageUrl ? `<div style="margin:8px 0;"><img src="${q.imageUrl}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border);"></div>` : ''}
              <div class="review-options">
                ${q.options.map((opt, j) => `
                  <div class="review-option ${j === q.correct ? 'correct-opt' : ''} ${j === userAns && !isCorrect ? 'wrong-opt' : ''}">
                    <strong>${opts[j]}.</strong> ${opt}
                    ${j === q.correct ? ' <span style="color:#059669;font-weight:700;">← Đáp án đúng</span>' : ''}
                    ${j === userAns && !isCorrect ? ' <span style="color:#dc2626;font-weight:700;">← Em đã chọn</span>' : ''}
                  </div>
                `).join('')}
              </div>
              ${!isCorrect && q.explanation ? `
                <div class="review-explanation">
                  <span class="review-explain-icon">💡</span>
                  <div><strong>Thầy giải thích:</strong> ${q.explanation}</div>
                </div>` : ''}
              ${!isCorrect ? `<div class="review-wrong-tip">📌 Hãy ôn lại dạng bài này để không bị sai lần sau!</div>` : ''}
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
// MODAL XEM LẠI BÀI LÀM (cho bảng xếp hạng)
// ====================================================
async function showStudentReviewModal(studentName, studentClass) {
  // Xoá modal cũ nếu có
  const oldModal = document.getElementById('reviewModal');
  if (oldModal) oldModal.remove();

  // Hiện modal loading trước
  const modal = document.createElement('div');
  modal.id = 'reviewModal';
  modal.className = 'review-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="review-modal-box" style="min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;">
      <div class="spinner"></div>
      <p style="color:var(--text-muted);font-size:0.9rem;">Đang tải bài làm của <strong>${studentName}</strong>...</p>
    </div>`;
  document.body.appendChild(modal);

  // Lấy review data (local + Firebase fallback)
  const reviewData = await fetchReview(studentName, studentClass);

  if (!reviewData || !reviewData.questions) {
    modal.innerHTML = `
      <div class="review-modal-box">
        <div class="review-modal-header">
          <h3>📋 Xem lại bài làm — ${studentName}</h3>
          <button class="review-modal-close" onclick="document.getElementById('reviewModal').remove()">✕</button>
        </div>
        <div class="review-modal-body" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:12px;">📂</div>
          <p>Chưa có dữ liệu bài làm của <strong>${studentName}</strong>.</p>
          <p style="font-size:0.85rem;color:#6b7280;">Bài làm sẽ tự động lưu sau khi học sinh nộp bài từ phiên bản này trở đi.</p>
        </div>
      </div>`;
    return;
  }

  const opts = ['A','B','C','D'];
  const wrongCount = reviewData.questions.filter((q,i) => reviewData.answers[i] !== q.correct).length;

  const questionsHtml = reviewData.questions.map((q, i) => {
    const userAns = reviewData.answers[i];
    const isCorrect = parseInt(userAns) === q.correct;
    return `
      <div class="review-item ${isCorrect ? 'correct' : 'wrong'}" data-correct="${isCorrect}" style="margin-bottom:16px;">
        <div class="review-header">
          <span class="review-num">${i + 1}</span>
          <span class="review-result">${isCorrect ? '✅ Đúng' : '❌ Sai — cần ôn lại!'}</span>
        </div>
        <div class="review-question">${q.text}</div>
        ${q.imageUrl ? `<div style="margin:8px 0;"><img src="${q.imageUrl}" style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--border);"></div>` : ''}
        <div class="review-options">
          ${q.options.map((opt, j) => `
            <div class="review-option ${j === q.correct ? 'correct-opt' : ''} ${j == userAns && !isCorrect ? 'wrong-opt' : ''}">
              <strong>${opts[j]}.</strong> ${opt}
              ${j === q.correct ? ' <span style="color:#059669;font-weight:700;">← Đáp án đúng</span>' : ''}
              ${j == userAns && !isCorrect ? ' <span style="color:#dc2626;font-weight:700;">← Em đã chọn</span>' : ''}
            </div>
          `).join('')}
        </div>
        ${!isCorrect && q.explanation ? `
          <div class="review-explanation">
            <span class="review-explain-icon">💡</span>
            <div><strong>Thầy giải thích:</strong> ${q.explanation}</div>
          </div>` : ''}
        ${!isCorrect ? `<div class="review-wrong-tip">📌 Hãy ôn lại dạng bài này để không bị sai lần sau!</div>` : ''}
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="review-modal-box">
      <div class="review-modal-header">
        <div>
          <h3>📋 Bài làm của <strong>${studentName}</strong> — ${reviewData.studentClass}</h3>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">
            ${reviewData.topicName} · ⏱️ ${Math.floor(reviewData.timeTaken/60)} phút ${reviewData.timeTaken%60} giây ·
            Điểm: <strong style="color:${reviewData.score>=8?'#059669':reviewData.score>=5?'#f59e0b':'#dc2626'}">${reviewData.score}/10</strong>
          </div>
        </div>
        <button class="review-modal-close" onclick="document.getElementById('reviewModal').remove()">✕</button>
      </div>
      <div class="review-modal-stats">
        <div class="rms-item rms-correct">✅ ${reviewData.correct} câu đúng</div>
        <div class="rms-item rms-wrong">❌ ${wrongCount} câu sai</div>
        <div class="rms-item rms-pct">📊 ${Math.round(reviewData.correct/reviewData.total*100)}% chính xác</div>
      </div>
      ${wrongCount > 0 ? `
        <div class="review-modal-warn">
          ⚠️ Em có <strong>${wrongCount} câu sai</strong> — hãy đọc kỹ phần giải thích và ôn lại nhé!
        </div>` : `
        <div class="review-modal-perfect">
          🎉 Hoàn hảo! Em trả lời đúng tất cả các câu! Thầy rất tự hào!
        </div>`}
      <div class="review-modal-filter-btns">
        <button class="btn btn-sm btn-outline" onclick="modalFilterReview('all')">📋 Tất cả (${reviewData.total})</button>
        <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1.5px solid #f87171;" onclick="modalFilterReview('wrong')">❌ Câu sai (${wrongCount})</button>
        <button class="btn btn-sm" style="background:#dcfce7;color:#14532d;border:1.5px solid #4ade80;" onclick="modalFilterReview('correct')">✅ Câu đúng (${reviewData.correct})</button>
      </div>
      <div class="review-modal-body" id="reviewModalBody">
        ${questionsHtml}
      </div>
    </div>`;

  document.body.appendChild(modal);
  // MathJax render nếu có
  setTimeout(() => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([modal]); }, 100);
}

function modalFilterReview(type) {
  const items = document.querySelectorAll('#reviewModalBody .review-item');
  items.forEach(item => {
    const isCorrect = item.dataset.correct === 'true';
    if (type === 'all') item.style.display = '';
    else if (type === 'wrong') item.style.display = isCorrect ? 'none' : '';
    else if (type === 'correct') item.style.display = isCorrect ? '' : 'none';
  });
}

// ====================================================
// DEBUG HELPER — kiểm tra dữ liệu khi gặp lỗi
// ====================================================
async function debugStorage() {
  const lines = [];
  lines.push('=== DEBUG localStorage ===');
  const sets = JSON.parse(localStorage.getItem('question_sets') || '{}');
  const setIds = Object.keys(sets);
  lines.push(`question_sets: ${setIds.length} bộ đề`);
  setIds.forEach(id => {
    const s = sets[id];
    lines.push(`  • "${s.setName}" | level=${s.level} | topic=${s.topic} | id=${id}`);
  });

  const allQ = JSON.parse(localStorage.getItem('quiz_questions_v2') || '{}');
  const qSetIds = Object.keys(allQ);
  lines.push(`quiz_questions_v2: ${qSetIds.length} keys`);
  qSetIds.forEach(id => {
    lines.push(`  • setId="${id}" → ${(allQ[id]||[]).length} câu`);
  });

  if (AppState.useFirebase && AppState.db) {
    lines.push('=== DEBUG Firebase ===');
    try {
      const snap = await AppState.db.collection('question_sets').get();
      lines.push(`Firebase question_sets: ${snap.size} docs`);
      snap.docs.forEach(d => {
        const data = d.data();
        lines.push(`  • "${data.setName}" | level=${data.level} | topic=${data.topic} | id=${data.setId}`);
      });
      const qSnap = await AppState.db.collection('questions').limit(5).get();
      lines.push(`Firebase questions (sample 5): ${qSnap.size} docs`);
      qSnap.docs.forEach(d => {
        const data = d.data();
        lines.push(`  • setId=${data.setId} | topic=${data.topic} | level=${data.level}`);
      });
    } catch(e) {
      lines.push('Firebase error: ' + e.message);
    }
  } else {
    lines.push('Firebase: không kết nối');
  }

  const msg = lines.join('\n');
  console.log(msg);
  alert(msg);
}

// ====================================================
// KHỞI ĐỘNG TRANG CHỦ
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  if (document.getElementById('app')) {
    renderHome();
  }
});
