'use strict';
/* =========================================================
 *  AIエージェント オフィス
 *  アイソメトリックなオフィスで、ちびキャラのAIエージェントが
 *  タスクを拾ってデスクで作業 → 納品BOXに提出するシミュレーション
 * ========================================================= */

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- アイソメ座標 ---------- */
const TW = 64, TH = 32, N = 10, WALL = 150, OX = 350, OY = 180;
const STAGE_W = 700, STAGE_H = 520;
const L = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z];
const P = (x, y, z = 0) => { const [a, b] = L(x, y, z); return [OX + a, OY + b]; };

function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => clamp(Math.round(v + (p < 0 ? v * p : (255 - v) * p)), 0, 255);
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
const pts = (list) => list.map(([x, y, z]) => L(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
function box(x, y, w, d, h, z, c, extra = '') {
  const top = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
  const right = [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]];
  const left = [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]];
  return poly(left, c, extra) + poly(right, shade(c, -0.18), extra) + poly(top, shade(c, 0.18), extra);
}

/* ---------- データ定義 ---------- */
const ROLES = {
  research: { label: 'リサーチャー', task: '調査', icon: '🔍' },
  writing:  { label: 'ライター',     task: '執筆', icon: '✍️' },
  code:     { label: 'エンジニア',   task: '開発', icon: '💻' },
  design:   { label: 'デザイナー',   task: 'デザイン', icon: '🎨' },
};
const DIFF = {
  easy:   { label: '★',   work: 22, reward: 10 },
  normal: { label: '★★',  work: 42, reward: 20 },
  hard:   { label: '★★★', work: 70, reward: 38 },
};
const TASK_IDEAS = {
  research: ['競合サービスを調査', '最新AIニュースまとめ', 'ユーザーアンケート分析', '市場規模をざっくり試算', 'SNSの反応をリサーチ', '料金プランを比較'],
  writing:  ['ブログ記事を執筆', 'メルマガの下書き', 'プレスリリース作成', 'FAQページを整備', 'SNS投稿を10本', '採用ページの文章'],
  code:     ['ログインのバグ修正', 'APIのテスト追加', 'ページ表示を高速化', 'ダークモード対応', 'CSV出力機能を実装', '依存パッケージ更新'],
  design:   ['バナー画像を作成', 'LPのワイヤーフレーム', 'アプリアイコン3案', '配色ガイドを作成', 'OGP画像をデザイン', '名刺デザイン'],
};
const WORK_LINES = {
  research: ['データ集めてます…', 'なるほど…🤔', 'グラフにしよ📊', 'ソースを確認中', '面白い傾向が！'],
  writing:  ['いい書き出し思いついた', '推敲中…', '誤字チェック✓', 'うーん言い回し…', '見出し決まった！'],
  code:     ['カタカタ…⌨️', 'テスト通った！', 'このバグ手強い…', 'console.log…', 'リファクタしよ'],
  design:   ['配色どうしよ🎨', 'いい感じ✨', '余白を調整…', 'フォント選び中', 'もう少し可愛く'],
};
const IDLE_LINES = ['ひまだな〜', '次のタスクまだかな', 'ストレッチ〜🙆', '今日もがんばろ', 'ふんふふ〜ん♪', '🌸'];
const CHATS = [
  ['おつかれ〜！', 'おつかれさま✨'], ['コーヒー飲んだ？', '3杯目です☕'], ['新しいタスクまだかな', 'のんびりしよ〜'],
  ['そのアクセかわいいね', 'ありがと💕'], ['最近どう？', 'レベル上げ中！'], ['お昼なに食べる？', 'カレー🍛'],
  ['バグ見つけちゃった', 'えっ、どこ!?'], ['いい天気だね', '窓きれい〜'],
];
const NAMES = ['アイ', 'クロ', 'ミク', 'ジェミ', 'ポン', 'ソラ', 'ルナ', 'テツ', 'ハル', 'ココ', 'ユウ', 'リン', 'ノア', 'モモ', 'レオ', 'ナギ', 'チャピ', 'ラマ'];

const SKINS = ['#ffe3cc', '#f9d2b3', '#eab793', '#c98f68', '#8e5b3c'];
const HAIRS = ['#3b2a20', '#7a4a2a', '#e9b95c', '#f6a6c4', '#7fb6ff', '#a184ff', '#57cfae', '#ececf2', '#ff7b5a', '#26232b'];
const OUTFITS = ['#ff8fb1', '#7ec4ff', '#8fe3a3', '#ffd166', '#c49bff', '#ffa36c', '#5f6caf', '#f5f5f5', '#3a3f52'];
const ACCENTS = ['#ff6b9a', '#ffd23f', '#4dc3ff', '#7ae582', '#b18cff', '#ffffff'];
const STYLES = { short: 'ショート', long: 'ロング', bob: 'ボブ', twin: 'ツイン', spiky: 'ツンツン', bun: 'おだんご' };
const ACCS = { none: 'なし', antenna: 'アンテナ', headphones: 'ヘッドホン', glasses: 'メガネ', ribbon: 'リボン', neko: 'ネコミミ' };

/* ---------- 部屋レイアウト ---------- */
const DESKS = [[2, 3], [4, 3], [6, 3], [2, 6], [4, 6], [6, 6]];
const COFFEE_SPOTS = [[8, 1], [7, 1], [9, 1]];
const OUTBOX_SPOTS = [[1, 4], [1, 3], [1, 5]];
const SOFA_SPOTS = [[1, 7], [1, 8]];
const HIRE_COST = 100;

const FURNITURE = [
  { kind: 'shelf', x: 2, y: 0 }, { kind: 'shelf', x: 3, y: 0 },
  { kind: 'server', x: 5, y: 0 },
  { kind: 'coffee', x: 8, y: 0 },
  { kind: 'plant', x: 9, y: 0 }, { kind: 'plant', x: 0, y: 9 }, { kind: 'plant', x: 9, y: 9 },
  { kind: 'outbox', x: 0, y: 4 },
  { kind: 'sofa', x: 0, y: 7, w: 1, d: 2 },
  ...DESKS.map(([x, y], i) => ({ kind: 'desk', x, y, desk: i })),
];
const blocked = new Set();
FURNITURE.forEach((f) => {
  for (let i = 0; i < (f.w || 1); i++) for (let j = 0; j < (f.d || 1); j++) blocked.add(`${f.x + i},${f.y + j}`);
});
const walkable = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !blocked.has(`${x},${y}`);

function bfs(from, to) {
  if (!walkable(to[0], to[1])) return null;
  const key = (p) => p[0] + ',' + p[1];
  const prev = new Map([[key(from), null]]);
  const q = [from];
  while (q.length) {
    const c = q.shift();
    if (c[0] === to[0] && c[1] === to[1]) {
      const path = [];
      for (let p = c; p && key(p) !== key(from); p = prev.get(key(p))) path.unshift(p);
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [c[0] + dx, c[1] + dy];
      if (walkable(n[0], n[1]) && !prev.has(key(n))) { prev.set(key(n), c); q.push(n); }
    }
  }
  return null;
}

/* =========================================================
 *  キャラクター（アメーバピグ風ちびキャラ）SVG
 * ========================================================= */
function charSVG(lk) {
  const { skin, hair, outfit, accent } = lk;
  const hd = shade(hair, -0.22);
  const pants = shade(outfit, -0.45);

  const back = {
    long: `<path d="M9,30 C4,58 8,74 15,74 L45,74 C52,74 56,58 51,30 Z" fill="${hair}"/>`,
    bob: `<path d="M8,30 C5,50 9,57 16,57 L44,57 C51,57 55,50 52,30 Z" fill="${hair}"/>`,
    twin: `<ellipse cx="5" cy="50" rx="7" ry="15" fill="${hair}"/><ellipse cx="55" cy="50" rx="7" ry="15" fill="${hair}"/>`,
    bun: `<circle cx="30" cy="11" r="8.5" fill="${hair}"/><circle cx="27" cy="8" r="2.5" fill="${shade(hair, 0.2)}"/>`,
  }[lk.style] || '';

  const front = {
    bob: `<path d="M7,41 C3,7 57,7 53,41 L49,41 L48,27 C40,30 20,30 12,27 L11,41 Z" fill="${hair}"/>`,
    spiky: `<path d="M7,37 L3,20 L12,22 L11,9 L20,15 L24,3 L30,12 L36,2 L40,14 L49,8 L48,21 L57,19 L53,37 L48,28 L40,26 L33,29 L26,25 L18,29 L12,28 Z" fill="${hair}"/>`,
  }[lk.style] || `<path d="M7,37 C4,9 56,9 53,37 L50,30 L45,25 L39,28 L34,23 L28,28 L22,24 L17,29 L12,27 Z" fill="${hair}"/>`;
  const locks = lk.style === 'long' ? `<path d="M8,30 L7,54 L13,47 Z M52,30 L53,54 L47,47 Z" fill="${hair}"/>` : '';
  const ties = lk.style === 'twin' ? `<circle cx="9" cy="34" r="3" fill="${accent}"/><circle cx="51" cy="34" r="3" fill="${accent}"/>` : '';

  const acc = {
    antenna: `<line x1="30" y1="14" x2="30" y2="2" stroke="#6b6b7a" stroke-width="1.8"/><circle class="ant-tip" cx="30" cy="2" r="3.4" fill="${accent === '#ffffff' ? '#4dc3ff' : accent}"/>`,
    headphones: `<path d="M8,34 C8,4 52,4 52,34" stroke="#4a4a58" stroke-width="3.2" fill="none"/><rect x="3" y="29" width="8" height="13" rx="3.5" fill="${accent}" stroke="#4a4a58" stroke-width="1.2"/><rect x="49" y="29" width="8" height="13" rx="3.5" fill="${accent}" stroke="#4a4a58" stroke-width="1.2"/>`,
    ribbon: `<g transform="translate(45,15) rotate(22)"><path d="M0,0 L-9,-6 L-9,6 Z M0,0 L9,-6 L9,6 Z" fill="${accent}"/><circle r="2.8" fill="${shade(accent, -0.2)}"/></g>`,
    neko: '',
  }[lk.acc] || '';
  const ears = lk.acc === 'neko'
    ? `<path d="M9,24 L11,4 L23,14 Z M51,24 L49,4 L37,14 Z" fill="${hair}"/><path d="M12,19 L13,9 L19,14 Z M48,19 L47,9 L41,14 Z" fill="#ffb3c8"/>`
    : '';
  const glasses = lk.acc === 'glasses'
    ? `<g fill="rgba(255,255,255,.25)" stroke="#3b3346" stroke-width="1.5"><circle cx="22" cy="38" r="6.2"/><circle cx="38" cy="38" r="6.2"/></g><path d="M28.2,38 L31.8,38" stroke="#3b3346" stroke-width="1.5"/>`
    : '';

  return `<svg viewBox="0 0 60 92" xmlns="http://www.w3.org/2000/svg">
  <g class="bob">
    ${back}
    <g class="legs">
      <g class="leg l"><rect x="22" y="72" width="7" height="13" rx="3" fill="${pants}"/><ellipse cx="25" cy="87" rx="5.2" ry="3.2" fill="#5b4537"/></g>
      <g class="leg r"><rect x="31" y="72" width="7" height="13" rx="3" fill="${pants}"/><ellipse cx="35" cy="87" rx="5.2" ry="3.2" fill="#5b4537"/></g>
    </g>
    <path d="M16,77 C16,60 21,53 30,53 C39,53 44,60 44,77 Z" fill="${outfit}"/>
    <path d="M24,54 L30,61 L36,54 Z" fill="#fff"/>
    <g class="arm l"><ellipse cx="16.5" cy="64" rx="4.6" ry="8" fill="${outfit}"/><circle cx="16" cy="71.5" r="3.6" fill="${skin}"/></g>
    <g class="arm r"><ellipse cx="43.5" cy="64" rx="4.6" ry="8" fill="${outfit}"/><circle cx="44" cy="71.5" r="3.6" fill="${skin}"/></g>
    ${ears}
    <ellipse cx="30" cy="34" rx="22" ry="20.5" fill="${skin}"/>
    <g class="face">
      <g class="eyes">
        <ellipse cx="22.6" cy="38" rx="3.5" ry="4.7" fill="#2d2234"/><ellipse cx="38.6" cy="38" rx="3.5" ry="4.7" fill="#2d2234"/>
        <circle cx="23.9" cy="36" r="1.5" fill="#fff"/><circle cx="39.9" cy="36" r="1.5" fill="#fff"/>
      </g>
      <ellipse cx="15.5" cy="45" rx="4.2" ry="2.5" fill="#ff8fa8" opacity=".5"/>
      <ellipse cx="44.5" cy="45" rx="4.2" ry="2.5" fill="#ff8fa8" opacity=".5"/>
      <path d="M27.5,46.5 Q30.5,49.5 33.5,46.5" stroke="#8a4040" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      ${glasses}
    </g>
    <g class="fronthair">${locks}${front}${ties}</g>
    <ellipse class="backhead" cx="30" cy="33" rx="22.6" ry="21.2" fill="${hair}"/>
    <path class="backhead" d="M14,24 Q30,16 46,24" stroke="${hd}" stroke-width="1.5" fill="none"/>
    ${acc}
  </g>
</svg>`;
}

/* =========================================================
 *  家具 SVG
 * ========================================================= */
function furnitureSVG(f) {
  switch (f.kind) {
    case 'desk': {
      let s = box(0.1, 0.18, 0.8, 0.64, 20, 0, '#c48e5c');
      s += box(0.04, 0.1, 0.92, 0.8, 4, 20, '#e2b07c');
      s += poly([[0.1, 0.52, 24.2], [0.28, 0.52, 24.2], [0.28, 0.82, 24.2], [0.1, 0.82, 24.2]], '#fffdf5');
      s += box(0.3, 0.34, 0.36, 0.28, 2, 24, '#cfd4dc');
      s += poly([[0.3, 0.62, 26], [0.66, 0.62, 26], [0.68, 0.64, 40], [0.32, 0.64, 40]], '#a7afbd');
      const [lx, ly] = L(0.49, 0.63, 33);
      s += `<ellipse cx="${lx}" cy="${ly}" rx="2.6" ry="2.4" fill="currentColor" opacity=".9"/>`;
      s += box(0.74, 0.2, 0.1, 0.1, 7, 24, '#ffffff');
      return s;
    }
    case 'shelf': {
      let s = box(0.06, 0.04, 0.9, 0.46, 74, 0, '#a8774a');
      const colors = ['#ff8fab', '#7ec4ff', '#ffd166', '#8fe3a3', '#c49bff', '#ffa36c'];
      [8, 32, 54].forEach((z, r) => {
        for (let i = 0; i < 6; i++) {
          if ((i + r) % 5 === 4) continue;
          const x = 0.1 + i * 0.135, h = 14 + ((i * 7 + r * 3) % 6);
          s += poly([[x, 0.505, z], [x + 0.11, 0.505, z], [x + 0.11, 0.505, z + h], [x, 0.505, z + h]], colors[(i + r * 2) % colors.length]);
        }
      });
      return s;
    }
    case 'server': {
      let s = box(0.12, 0.08, 0.76, 0.58, 86, 0, '#3a4256');
      const ledColors = ['#5fffb0', '#4dc3ff', '#ff6b9a', '#ffd23f'];
      for (let r = 0; r < 6; r++) {
        s += poly([[0.18, 0.665, 10 + r * 12], [0.82, 0.665, 10 + r * 12], [0.82, 0.665, 18 + r * 12], [0.18, 0.665, 18 + r * 12]], '#2a3042');
        for (let i = 0; i < 3; i++) {
          const [cx, cy] = L(0.26 + i * 0.1, 0.665, 14 + r * 12);
          s += `<circle class="led" style="animation-delay:${(r * 0.37 + i * 0.6) % 1.4}s" cx="${cx}" cy="${cy}" r="1.7" fill="${ledColors[(r + i) % 4]}"/>`;
        }
      }
      const [tx, ty] = L(0.5, 0.37, 94);
      s += `<text x="${tx}" y="${ty}" font-size="9" font-weight="800" text-anchor="middle" fill="#7a86a8">AI CORE</text>`;
      return s;
    }
    case 'coffee': {
      let s = box(0.05, 0.05, 0.9, 0.6, 30, 0, '#efe7dc');
      s += box(0.25, 0.1, 0.45, 0.38, 30, 30, '#4a4f5c');
      s += box(0.38, 0.48, 0.16, 0.12, 6, 30, '#ffffff');
      const [sx, sy] = L(0.46, 0.54, 40);
      s += `<path class="steam" d="M${sx - 2},${sy} q-3,-5 0,-9 q3,-4 0,-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      const [tx, ty] = L(0.5, 0.3, 70);
      s += `<text x="${tx}" y="${ty}" font-size="12" text-anchor="middle">☕</text>`;
      return s;
    }
    case 'plant': {
      let s = box(0.3, 0.3, 0.4, 0.4, 16, 0, '#e08a63');
      const [cx, cy] = L(0.5, 0.5, 30);
      s += `<ellipse cx="${cx - 9}" cy="${cy + 2}" rx="9" ry="12" fill="#5cbf7a"/>`;
      s += `<ellipse cx="${cx + 9}" cy="${cy + 1}" rx="9" ry="12" fill="#4fae6d"/>`;
      s += `<ellipse cx="${cx}" cy="${cy - 9}" rx="10" ry="14" fill="#6fd38d"/>`;
      return s;
    }
    case 'outbox': {
      let s = box(0.12, 0.15, 0.7, 0.66, 36, 0, '#6aaef0');
      s += poly([[0.82, 0.3, 26], [0.82, 0.66, 26], [0.82, 0.66, 30], [0.82, 0.3, 30]], '#2f5f94');
      const [tx, ty] = L(0.45, 0.48, 58);
      s += `<rect x="${tx - 24}" y="${ty - 11}" width="48" height="16" rx="8" fill="#fff" stroke="#6aaef0" stroke-width="1.5"/>`;
      s += `<text x="${tx}" y="${ty + 1}" font-size="9" font-weight="800" text-anchor="middle" fill="#2f5f94">納品BOX</text>`;
      return s;
    }
    case 'sofa': {
      const c = '#ff9fbf';
      let s = box(0.04, 0.05, 0.28, 1.9, 40, 0, shade(c, -0.08));
      s += box(0.2, 0.05, 0.7, 1.9, 14, 0, c);
      s += box(0.25, 0.25, 0.62, 0.72, 5, 14, shade(c, 0.25));
      s += box(0.25, 1.03, 0.62, 0.72, 5, 14, shade(c, 0.25));
      s += box(0.14, 0.05, 0.78, 0.2, 24, 0, shade(c, -0.05));
      s += box(0.14, 1.75, 0.78, 0.2, 24, 0, shade(c, -0.05));
      return s;
    }
  }
  return '';
}

function roomSVG() {
  let s = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop id="sky1" offset="0" stop-color="#8fd3ff"/><stop id="sky2" offset="1" stop-color="#d8f1ff"/></linearGradient></defs>';
  const W = (list, fill, extra = '') => `<polygon points="${list.map(([x, y, z]) => P(x, y, z).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  // walls
  s += W([[0, 0, 0], [0, N, 0], [0, N, WALL], [0, 0, WALL]], '#fbe9d6');
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, WALL], [0, 0, WALL]], '#f5dcc3');
  s += W([[0, 0, 0], [0, N, 0], [0, N, 9], [0, 0, 9]], '#d9a47a');
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, 9], [0, 0, 9]], '#c99268');
  s += W([[0, N, WALL], [0, 0, WALL], [-0.25, -0.25, WALL], [-0.25, N, WALL]], '#fff6ec');
  s += W([[0, 0, WALL], [N, 0, WALL], [N, -0.25, WALL], [-0.25, -0.25, WALL]], '#fff6ec');

  // floor
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
    s += W([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => [a, b, 0]), (x + y) % 2 ? '#e9c89c' : '#efd2aa', 'stroke="#e2bd8e" stroke-width=".6"');
  }
  // rug
  s += W([[2.6, 7.4, 0], [7.6, 7.4, 0], [7.6, 9.5, 0], [2.6, 9.5, 0]], '#bfe0f5');
  s += W([[2.85, 7.6, 0], [7.35, 7.6, 0], [7.35, 9.3, 0], [2.85, 9.3, 0]], 'none', 'stroke="#fff" stroke-width="2" stroke-dasharray="6 5"');

  // right wall decor (plane y=0): (u,v) -> (u, 0.5u + v)
  const [rx, ry] = P(0, 0, 0);
  s += `<g transform="matrix(1,0.5,0,1,${rx},${ry})">
    <rect x="58" y="-142" width="80" height="58" rx="4" fill="url(#sky)" stroke="#fff" stroke-width="5"/>
    <g id="stars" opacity="0"><circle cx="75" cy="-128" r="1.3" fill="#fff"/><circle cx="110" cy="-118" r="1" fill="#fff"/><circle cx="124" cy="-132" r="1.4" fill="#fff"/><circle cx="90" cy="-104" r="1" fill="#fff"/></g>
    <circle id="sun" cx="118" cy="-126" r="7" fill="#fff3a6"/>
    <path d="M98,-142 L98,-84 M58,-113 L138,-113" stroke="#fff" stroke-width="3"/>
    <ellipse cx="74" cy="-96" rx="10" ry="4" fill="#fff" opacity=".85"/>
    <circle cx="218" cy="-112" r="15" fill="#fff" stroke="#c99268" stroke-width="3"/>
    <line id="hourHand" x1="218" y1="-112" x2="218" y2="-120" stroke="#5a4636" stroke-width="2.4" stroke-linecap="round"/>
    <line id="minHand" x1="218" y1="-112" x2="218" y2="-124" stroke="#ff7aa8" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="262" y="-134" width="42" height="52" rx="3" fill="#fff" stroke="#e2b07c" stroke-width="3"/>
    <text x="283" y="-121" font-size="7" font-weight="800" text-anchor="middle" fill="#c99268">MVP</text>
    <text id="mvpName" x="283" y="-100" font-size="10" font-weight="800" text-anchor="middle" fill="#ff7aa8">-</text>
    <text x="283" y="-89" font-size="9" text-anchor="middle">👑</text>
  </g>`;

  // left wall decor (plane x=0): (u,v) -> (u, -0.5u + v), origin at y=N
  const [lx, ly] = P(0, N, 0);
  s += `<g transform="matrix(1,-0.5,0,1,${lx},${ly})">
    <rect x="44" y="-128" width="66" height="56" rx="6" fill="#fff" stroke="#ff9fbf" stroke-width="3"/>
    <text x="77" y="-108" font-size="11" font-weight="800" text-anchor="middle" fill="#ff7aa8">AI OFFICE</text>
    <text x="77" y="-90" font-size="16" text-anchor="middle">🤖💕</text>
    <rect x="190" y="-138" width="112" height="70" rx="5" fill="#ffffff" stroke="#b9c3d6" stroke-width="3"/>
    <text x="246" y="-122" font-size="10" font-weight="800" text-anchor="middle" fill="#5f6caf">TASK BOARD</text>
    <text id="wbQueue" x="200" y="-104" font-size="10" fill="#4a3f55">待ち 0</text>
    <text id="wbDoing" x="200" y="-90" font-size="10" fill="#4a3f55">作業中 0</text>
    <text id="wbDone" x="200" y="-76" font-size="10" fill="#4a3f55">完了 0</text>
    <path d="M262,-104 l8,-8 l8,5 l10,-12" stroke="#5fd39a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`;
  return s;
}

/* =========================================================
 *  ゲーム状態
 * ========================================================= */
let state;
const els = new Map();
let selectedId = null;
let speed = 1;
const timers = [];

function randomLook() {
  return {
    skin: pick(SKINS.slice(0, 4)), hair: pick(HAIRS), outfit: pick(OUTFITS), accent: pick(ACCENTS),
    style: pick(Object.keys(STYLES)), acc: pick(Object.keys(ACCS)),
  };
}

function makeAgent(name, role, look, desk) {
  const [dx, dy] = DESKS[desk];
  return {
    id: state.nextId++, name, role, look, desk,
    x: dx + 0.5, y: dy - 0.5, tile: [dx, dy - 1],
    path: [], sitting: null, state: 'idle', taskId: null,
    energy: rand(70, 100), xp: 0, level: 1, done: 0,
    wait: 0, idleT: rand(0.5, 2), bubble: null, flip: false, back: false,
  };
}

function makeTask(title, type, diff, assignee = null) {
  return {
    id: state.nextId++, title, type, diff, work: DIFF[diff].work, progress: 0,
    status: 'queued', agentId: null, assignee, result: null, createdAt: state.time, doneAt: null,
  };
}

function newGame() {
  state = { nextId: 1, time: 0, coins: 30, agents: [], tasks: [], autoTask: true, nextAuto: 25 };
  state.agents.push(makeAgent('アイ', 'research', { skin: '#ffe3cc', hair: '#f6a6c4', outfit: '#7ec4ff', accent: '#4dc3ff', style: 'long', acc: 'antenna' }, 0));
  state.agents.push(makeAgent('クロ', 'code', { skin: '#f9d2b3', hair: '#26232b', outfit: '#3a3f52', accent: '#ff6b9a', style: 'spiky', acc: 'headphones' }, 1));
  state.agents.push(makeAgent('ミク', 'writing', { skin: '#ffe3cc', hair: '#57cfae', outfit: '#ff8fb1', accent: '#ff6b9a', style: 'twin', acc: 'ribbon' }, 2));
  state.tasks.push(makeTask('最新AIニュースまとめ', 'research', 'easy'));
  state.tasks.push(makeTask('ログインのバグ修正', 'code', 'normal'));
  state.tasks.push(makeTask('ブログ記事を執筆', 'writing', 'normal'));
  state.tasks.push(makeTask('バナー画像を作成', 'design', 'easy'));
}

const SAVE_KEY = 'ai-agent-office-v1';
function save() {
  try {
    const data = { ...state, agents: state.agents.map((a) => ({ ...a, path: [], bubble: null })) };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    state = JSON.parse(raw);
    state.agents.forEach((a) => {
      // 途中の移動は保存しないので、所属タイルに戻して再開
      if (a.sitting === 'desk') { const [dx, dy] = DESKS[a.desk]; a.tile = [dx, dy - 1]; }
      a.x = a.tile[0] + 0.5; a.y = a.tile[1] + 0.5; a.sitting = null; a.path = [];
      a.state = 'idle'; a.wait = 0; a.after = null; a.onArrive = null; a.idleT = 0.5;
    });
    state.tasks.forEach((t) => { if (t.status === 'doing' && !state.agents.some((a) => a.taskId === t.id)) { t.status = 'queued'; t.agentId = null; } });
    return true;
  } catch (e) { return false; }
}

const taskById = (id) => state.tasks.find((t) => t.id === id);
const agentById = (id) => state.agents.find((a) => a.id === id);

/* ---------- 時間差イベント（ゲーム内時間） ---------- */
function later(delay, fn) { timers.push({ at: state.time + delay, fn }); }

function say(a, text, dur = 2.8) {
  a.bubble = { text, until: state.time + dur };
}

function floatText(x, y, text) {
  const [sx, sy] = P(x, y);
  const d = document.createElement('div');
  d.className = 'float';
  d.style.left = sx + 'px'; d.style.top = (sy - 60) + 'px';
  d.textContent = text;
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

function toast(text) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = text;
  $('#toasts').appendChild(d);
  setTimeout(() => d.remove(), 3300);
}

/* =========================================================
 *  エージェントの行動
 * ========================================================= */
const occupied = (a, t) => state.agents.some((o) => o !== a && o.tile[0] === t[0] && o.tile[1] === t[1]);

function goTo(a, tile, onArrive, extraPoint) {
  const points = [];
  if (a.sitting) { points.push([a.tile[0] + 0.5, a.tile[1] + 0.5]); a.sitting = null; }
  const route = bfs(a.tile, tile);
  if (!route) { onArrive && onArrive(); return; }
  route.forEach(([x, y]) => points.push([x + 0.5, y + 0.5]));
  if (extraPoint) points.push(extraPoint);
  a.path = points;
  a.tile = [tile[0], tile[1]];
  a.onArrive = onArrive || null;
}

function goDesk(a) {
  const [dx, dy] = DESKS[a.desk];
  a.state = 'toDesk';
  goTo(a, [dx, dy - 1], () => {
    a.sitting = 'desk'; a.state = 'work'; a.flip = true; a.back = false;
    const t = taskById(a.taskId);
    if (t) say(a, t.progress > 0 ? '続きやろっと' : pick(['よし、始めます！', '集中モード💪', 'がんばるぞ〜']));
  }, [dx + 0.18, dy + 0.18]);
}

function goCoffee(a) {
  const spot = COFFEE_SPOTS.find((s) => !occupied(a, s)) || COFFEE_SPOTS[0];
  a.state = 'coffee';
  goTo(a, spot, () => {
    a.flip = false;
    say(a, '☕ ふぅ〜');
    a.wait = 3.5; a.waitKind = 'coffee';
    a.after = () => { a.energy = clamp(a.energy + 65, 0, 100); say(a, pick(['充電完了！⚡', 'よし復活！', 'おいしかった〜'])); a.state = 'idle'; a.idleT = 0.3; };
  });
}

function goSofa(a) {
  const spot = SOFA_SPOTS.find((s) => !occupied(a, s));
  if (!spot) return wander(a);
  a.state = 'sofa';
  goTo(a, spot, () => {
    a.sitting = 'sofa'; a.flip = false;
    say(a, pick(['ごろごろ〜', 'ちょっと休憩😌', 'ふかふか〜']));
    a.wait = rand(5, 9); a.waitKind = 'sofa';
    a.after = () => { a.state = 'idle'; a.idleT = 0.5; };
  }, [spot[0] - 0.42, spot[1] + 0.5]);
}

function wander(a) {
  for (let i = 0; i < 12; i++) {
    const t = [Math.floor(rand(0, N)), Math.floor(rand(0, N))];
    if (walkable(t[0], t[1]) && !occupied(a, t) && !DESKS.some(([x, y]) => x === t[0] && y - 1 === t[1])) {
      a.state = 'walk';
      goTo(a, t, () => { a.state = 'idle'; a.idleT = rand(1, 3); if (Math.random() < 0.3) say(a, pick(IDLE_LINES)); });
      return;
    }
  }
}

function startChat(a) {
  const others = state.agents.filter((b) => b !== a && b.state === 'idle' && !b.path.length && !b.sitting && !b.taskId);
  if (!others.length) return wander(a);
  const b = pick(others);
  const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [b.tile[0] + dx, b.tile[1] + dy]).find((t) => walkable(t[0], t[1]) && !occupied(a, t));
  if (!spot) return wander(a);
  b.state = 'chat'; b.wait = 8; b.waitKind = 'chat'; b.after = () => { b.state = 'idle'; };
  a.state = 'chat';
  goTo(a, spot, () => {
    const [l1, l2] = pick(CHATS);
    const toB = (b.x - a.x) - (b.y - a.y);
    a.flip = toB < 0; b.flip = !a.flip;
    say(a, l1, 2.2);
    later(1.8, () => say(b, l2, 2.4));
    a.wait = 4.2; a.waitKind = 'chat'; a.after = () => { a.state = 'idle'; a.idleT = rand(1, 3); };
    b.wait = 4.2; b.after = () => { b.state = 'idle'; b.idleT = rand(1, 3); };
  });
}

function pickTask(a) {
  const queued = state.tasks.filter((t) => t.status === 'queued');
  return queued.find((t) => t.assignee === a.id)
    || queued.find((t) => !t.assignee && t.type === a.role)
    || queued.find((t) => !t.assignee && !state.agents.some((o) => o !== a && o.role === t.type && o.state === 'idle' && !o.taskId))
    || null;
}

function think(a, dt) {
  if (a.taskId) {
    if (a.energy < 20) return goCoffee(a);
    return goDesk(a);
  }
  if (a.energy < 30) return goCoffee(a);
  const t = pickTask(a);
  if (t) {
    t.status = 'doing'; t.agentId = a.id; a.taskId = t.id;
    say(a, `了解！「${t.title}」やります`);
    dirty = true;
    return goDesk(a);
  }
  a.idleT -= dt;
  if (a.idleT > 0) return;
  a.idleT = rand(2.5, 6);
  const r = Math.random();
  if (r < 0.4) wander(a);
  else if (r < 0.55) goSofa(a);
  else if (r < 0.75) startChat(a);
  else if (r < 0.85) say(a, pick(IDLE_LINES));
}

function work(a, dt) {
  const t = taskById(a.taskId);
  if (!t) { a.taskId = null; a.state = 'idle'; return goTo(a, a.tile, () => {}); }
  const rate = (t.type === a.role ? 1.6 : 1) * (1 + 0.08 * (a.level - 1)) * (a.energy > 15 ? 1 : 0.55);
  t.progress = Math.min(t.work, t.progress + dt * rate);
  a.energy = clamp(a.energy - dt * 1.15, 0, 100);
  if (!a.bubble && Math.random() < dt * 0.1) say(a, pick(WORK_LINES[t.type]));
  if (t.progress >= t.work) return deliver(a, t);
  if (a.energy < 10) { say(a, 'ちょっと休憩…💦'); goCoffee(a); }
}

function deliver(a, t) {
  a.state = 'deliver';
  say(a, pick(['できた！', '完成〜✨', '納品しまーす']));
  const spot = OUTBOX_SPOTS.find((s) => !occupied(a, s)) || OUTBOX_SPOTS[0];
  goTo(a, spot, () => {
    a.flip = true;
    a.wait = 1; a.waitKind = 'deliver';
    a.after = () => complete(a, t);
  });
}

function complete(a, t) {
  const reward = DIFF[t.diff].reward + (a.level - 1) * 2;
  t.status = 'done'; t.doneAt = state.time; t.agentId = a.id; t.agentName = a.name;
  t.result = makeResult(t, a);
  a.taskId = null; a.done++;
  a.xp += t.work * 2;
  state.coins += reward;
  floatText(1, 4, `+${reward}🪙`);
  toast(`✅ ${a.name}が「${t.title}」を納品！ +${reward}🪙`);
  const need = a.level * 100;
  if (a.xp >= need) {
    a.xp -= need; a.level++;
    later(0.6, () => { say(a, `レベル${a.level}になった！🎉`, 3); floatText(a.x, a.y, 'LEVEL UP!'); });
    toast(`🎉 ${a.name}が Lv${a.level} にレベルアップ！`);
  } else {
    say(a, pick(['ふぅ、おわり！', '次いこ〜', 'お役に立てたかな？']));
  }
  a.state = 'idle'; a.idleT = 1;
  dirty = true;
}

function makeResult(t, a) {
  const R = ROLES[t.type];
  const n = () => Math.floor(rand(3, 9));
  const bodies = {
    research: [
      `■ 要点\n・主要プレイヤーは${n()}社。上位3社でシェアの約${Math.floor(rand(55, 80))}%\n・ユーザーの不満は「料金」と「使いづらさ」に集中\n・伸びているのは${pick(['個人向け', '中小企業向け', 'モバイル', 'AI連携'])}の領域`,
      `■ 推奨アクション\n1. ${pick(['無料プランの導線改善', 'オンボーディング短縮', '事例コンテンツ拡充'])}\n2. ${pick(['価格ページのA/Bテスト', '競合比較表の公開', 'SNSでの発信強化'])}`,
    ],
    writing: [
      `■ タイトル案\n「${pick(['知らないと損する', '3分でわかる', 'プロが教える', 'はじめての'])}${t.title.replace(/を.*$/, '')}」`,
      `■ 構成\n1. 導入：読者の悩みに共感\n2. 本題：ポイントを${n()}つに整理\n3. 事例：具体的なビフォーアフター\n4. まとめ：次の一歩を提案\n\n文字数：約${Math.floor(rand(18, 45)) * 100}字`,
    ],
    code: [
      `■ 変更内容\n・${pick(['原因はキャッシュの不整合でした', 'null チェック漏れを修正', 'N+1クエリを解消', '型定義を厳密化'])}\n・ユニットテストを${n()}件追加（すべて ✅ pass）`,
      `■ 結果\n・${pick(['表示速度が約2.1倍に', 'エラー率 0.8% → 0.02%', 'ビルド時間 -35%', 'Lighthouse 98点'])}\n・レビュー依頼済み：PR #${Math.floor(rand(100, 999))}`,
    ],
    design: [
      `■ コンセプト\n「${pick(['やさしく、たのしく', '信頼感とワクワク', 'シンプル・イズ・ベスト', 'ポップで元気'])}」`,
      `■ 仕様\n・メインカラー：${pick(['#FF7AA8 ピンク', '#6FB6FF スカイ', '#5FD39A ミント', '#FFD166 レモン'])}\n・フォント：丸ゴシック\n・バリエーション：${n()}案（おすすめは B 案）`,
    ],
  };
  return `${R.icon} ${t.title}\n担当：${a.name}（Lv${a.level} ${ROLES[a.role].label}）\n\n${bodies[t.type].join('\n\n')}`;
}

/* ---------- 毎フレームの更新 ---------- */
const WALK_SPEED = 2.4;

function updateAgent(a, dt) {
  if (a.bubble && a.bubble.until < state.time) a.bubble = null;

  if (a.path.length) {
    const [tx, ty] = a.path[0];
    const dx = tx - a.x, dy = ty - a.y;
    const dist = Math.hypot(dx, dy);
    const step = WALK_SPEED * dt;
    if (dist > 0.001) { a.flip = (dx - dy) < -0.01 ? true : (dx - dy) > 0.01 ? false : a.flip; a.back = (dx + dy) < -0.01; }
    if (dist <= step) {
      a.x = tx; a.y = ty; a.path.shift();
      if (!a.path.length) {
        a.back = false;
        const cb = a.onArrive; a.onArrive = null;
        cb && cb();
      }
    } else { a.x += dx / dist * step; a.y += dy / dist * step; }
    return;
  }

  if (a.wait > 0) {
    a.wait -= dt;
    if (a.waitKind === 'sofa') a.energy = clamp(a.energy + dt * 4, 0, 100);
    if (a.wait <= 0 && a.after) { const f = a.after; a.after = null; f(); }
    return;
  }

  if (a.state === 'work') return work(a, dt);
  if (a.state === 'idle') return think(a, dt);
  // 想定外の状態からは idle に復帰
  if (!a.path.length && a.wait <= 0) a.state = 'idle';
}

function autoTasks(dt) {
  if (!state.autoTask) return;
  state.nextAuto -= dt;
  if (state.nextAuto > 0) return;
  state.nextAuto = rand(18, 38);
  if (state.tasks.filter((t) => t.status === 'queued').length >= 6) return;
  const type = pick(Object.keys(ROLES));
  const diff = pick(['easy', 'easy', 'normal', 'normal', 'hard']);
  state.tasks.push(makeTask(pick(TASK_IDEAS[type]), type, diff));
  toast(`📨 新しい依頼：「${state.tasks[state.tasks.length - 1].title}」`);
  dirty = true;
}

function step(dt) {
  state.time += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= state.time) { const t = timers.splice(i, 1)[0]; t.fn(); }
  state.agents.forEach((a) => updateAgent(a, dt));
  autoTasks(dt);
  // 完了ログは最新 40 件だけ残す
  const done = state.tasks.filter((t) => t.status === 'done');
  if (done.length > 40) { const drop = new Set(done.slice(0, done.length - 40).map((t) => t.id)); state.tasks = state.tasks.filter((t) => !drop.has(t.id)); }
}

/* =========================================================
 *  描画
 * ========================================================= */
function buildRoom() {
  $('#room').innerHTML = roomSVG();
  const layer = $('#entities');
  FURNITURE.forEach((f) => {
    const d = document.createElement('div');
    d.className = 'furn';
    const [sx, sy] = P(f.x, f.y);
    d.style.transform = `translate(${sx}px,${sy}px)`;
    d.style.zIndex = Math.round((f.x + f.y + ((f.w || 1) + (f.d || 1)) / 2) * 100);
    d.innerHTML = `<svg width="1" height="1">${furnitureSVG(f)}</svg>`;
    if (f.kind === 'desk') d.dataset.desk = f.desk;
    layer.appendChild(d);
  });
}

function syncDeskColors() {
  document.querySelectorAll('.furn[data-desk]').forEach((d) => {
    const owner = state.agents.find((a) => a.desk === +d.dataset.desk);
    d.style.color = owner ? owner.look.accent === '#ffffff' ? owner.look.outfit : owner.look.accent : '#d5dae2';
  });
}

function agentEl(a) {
  let el = els.get(a.id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'agent';
    el.innerHTML = '<div class="shadow"></div><div class="figure"></div><div class="nm"></div><div class="pbar"><i></i></div><div class="sel">▼</div>';
    el.addEventListener('click', (e) => { e.stopPropagation(); openAgent(a.id); });
    $('#entities').appendChild(el);
    els.set(a.id, el);
    el._look = '';
  }
  return el;
}

function renderAgents() {
  state.agents.forEach((a) => {
    const el = agentEl(a);
    const lookKey = JSON.stringify(a.look);
    if (el._look !== lookKey) { el.querySelector('.figure').innerHTML = charSVG(a.look); el._look = lookKey; }
    if (el._name !== a.name) { el.querySelector('.nm').textContent = a.name; el._name = a.name; }

    const [sx, sy] = P(a.x, a.y);
    el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
    el.style.zIndex = Math.round((a.x + a.y) * 100) + (a.sitting === 'sofa' ? 60 : 1);

    const cls = ['agent'];
    if (a.path.length) cls.push('walk');
    if (a.flip) cls.push('flip');
    if (a.back && a.path.length) cls.push('back');
    if (a.sitting) cls.push('sit-' + a.sitting);
    if (a.state === 'work' && a.sitting === 'desk') cls.push('work');
    if (a.id === selectedId) cls.push('selected');
    if (a.bubble) cls.push('has-bubble');
    const c = cls.join(' ');
    if (el.className !== c) el.className = c;

    let b = el.querySelector('.bubble');
    if (a.bubble) {
      if (!b) { b = document.createElement('div'); b.className = 'bubble'; el.appendChild(b); }
      if (b.textContent !== a.bubble.text) { b.textContent = a.bubble.text; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
    } else if (b) b.remove();

    const t = a.state === 'work' ? taskById(a.taskId) : null;
    const pbar = el.querySelector('.pbar');
    pbar.style.display = t ? '' : 'none';
    if (t) pbar.firstChild.style.width = (t.progress / t.work * 100).toFixed(1) + '%';
  });
  for (const [id, el] of els) if (!agentById(id)) { el.remove(); els.delete(id); }
}

function renderRoomLive() {
  const minutes = 9 * 60 + Math.floor(state.time);
  const day = Math.floor(minutes / 1440) + 1, hh = Math.floor(minutes / 60) % 24, mm = minutes % 60;
  $('#clock').textContent = `Day ${day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  const rot = (el, deg, len) => {
    const r = deg * Math.PI / 180;
    el.setAttribute('x2', (218 + Math.sin(r) * len).toFixed(1));
    el.setAttribute('y2', (-112 - Math.cos(r) * len).toFixed(1));
  };
  rot($('#hourHand'), (hh % 12) * 30 + mm * 0.5, 8);
  rot($('#minHand'), mm * 6, 12);

  const night = hh >= 19 || hh < 6, dusk = hh >= 17 && hh < 19;
  $('#sky1').setAttribute('stop-color', night ? '#1d2453' : dusk ? '#ff9a76' : '#8fd3ff');
  $('#sky2').setAttribute('stop-color', night ? '#40397a' : dusk ? '#ffd7a8' : '#d8f1ff');
  $('#stars').setAttribute('opacity', night ? 1 : 0);
  $('#sun').setAttribute('fill', night ? '#fffbe0' : '#fff3a6');
}

let dirty = true;
function renderUI() {
  const queued = state.tasks.filter((t) => t.status === 'queued');
  const doing = state.tasks.filter((t) => t.status === 'doing');
  const done = state.tasks.filter((t) => t.status === 'done');
  const totalDone = state.agents.reduce((s, a) => s + a.done, 0);

  $('#coins').textContent = state.coins;
  $('#doneCount').textContent = totalDone;
  $('#wbQueue').textContent = `待ち ${queued.length}`;
  $('#wbDoing').textContent = `作業中 ${doing.length}`;
  $('#wbDone').textContent = `完了 ${totalDone}`;
  const mvp = state.agents.slice().sort((a, b) => b.done - a.done)[0];
  $('#mvpName').textContent = mvp && mvp.done ? mvp.name : '-';

  // 作業中（進捗は毎回更新）
  $('#doingList').innerHTML = doing.length ? doing.map((t) => {
    const a = agentById(t.agentId);
    return `<li><span>${ROLES[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(a ? a.name : '')}</span><span class="mini"><i style="width:${(t.progress / t.work * 100).toFixed(0)}%"></i></span></li>`;
  }).join('') : '<li class="empty">いまは誰も作業していません</li>';

  // ロスター
  $('#roster').innerHTML = state.agents.map((a) => `
    <div class="chip" data-agent="${a.id}">
      <div class="face">${charSVG(a.look)}</div>
      <b>${esc(a.name)} <small>Lv${a.level}</small></b>
      <span>${statusText(a)}</span>
      <div class="en"><i style="width:${a.energy.toFixed(0)}%"></i></div>
    </div>`).join('');

  if (!dirty) return;
  dirty = false;
  syncDeskColors();

  $('#queueCount').textContent = queued.length ? `(${queued.length})` : '';
  $('#queueList').innerHTML = queued.length ? queued.map((t) => {
    const who = t.assignee ? agentById(t.assignee) : null;
    return `<li><span>${ROLES[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${DIFF[t.diff].label}${who ? ' → ' + esc(who.name) : ''}</span><button class="x" data-del="${t.id}" title="取り消す">✕</button></li>`;
  }).join('') : '<li class="empty">依頼待ちのタスクはありません</li>';

  $('#doneList').innerHTML = done.length ? done.slice().reverse().map((t) =>
    `<li class="clickable" data-result="${t.id}"><span>${ROLES[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(t.agentName || '')} ${DIFF[t.diff].label}</span></li>`
  ).join('') : '<li class="empty">まだ完了したタスクはありません</li>';

  const sel = $('#taskAssignee'), cur = sel.value;
  sel.innerHTML = '<option value="">担当：おまかせ</option>' + state.agents.map((a) => `<option value="${a.id}">担当：${esc(a.name)}（${ROLES[a.role].label}）</option>`).join('');
  sel.value = state.agents.some((a) => String(a.id) === cur) ? cur : '';

  $('#hireBtn').textContent = `＋ 採用 (${HIRE_COST}🪙)`;
}

function statusText(a) {
  const t = taskById(a.taskId);
  switch (a.state) {
    case 'work': return `💻 ${t ? t.title : '作業中'}`;
    case 'toDesk': return '🚶 デスクへ';
    case 'deliver': return '📦 納品中';
    case 'coffee': return '☕ コーヒー休憩';
    case 'sofa': return '🛋️ ひと休み';
    case 'chat': return '💬 おしゃべり';
    case 'walk': return '🚶 おさんぽ';
    default: return t ? '⏸ 作業待ち' : '😊 ひま';
  }
}

/* =========================================================
 *  モーダル：プロフィール & 着せかえ
 * ========================================================= */
function openModal(id) { $(id).hidden = false; }
function closeModals() {
  document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
  selectedId = null;
}

function openAgent(id) {
  selectedId = id;
  renderAgentModal();
  openModal('#agentModal');
}

function renderAgentModal() {
  const a = agentById(selectedId);
  if (!a) return;
  $('#agentPreview').innerHTML = charSVG(a.look);
  if (document.activeElement !== $('#agentName')) $('#agentName').value = a.name;
  $('#agentRole').value = a.role;
  $('#agentLv').textContent = a.level;
  $('#agentXp').style.width = (a.xp / (a.level * 100) * 100) + '%';
  $('#agentEnergy').style.width = a.energy + '%';
  $('#agentStatus').textContent = statusText(a);
  $('#agentDone').textContent = `これまでの納品：${a.done}件 ／ デスク #${a.desk + 1}`;

  const sw = (key, list) => list.map((c) => `<button class="sw${a.look[key] === c ? ' on' : ''}" style="background:${c}" data-look="${key}" data-val="${c}" aria-label="${c}"></button>`).join('');
  const opt = (key, map) => Object.entries(map).map(([k, v]) => `<button class="opt${a.look[key] === k ? ' on' : ''}" data-look="${key}" data-val="${k}">${v}</button>`).join('');
  $('#customizer').innerHTML = `
    <div class="grp"><span>髪型</span>${opt('style', STYLES)}</div>
    <div class="grp"><span>髪の色</span>${sw('hair', HAIRS)}</div>
    <div class="grp"><span>服の色</span>${sw('outfit', OUTFITS)}</div>
    <div class="grp"><span>肌の色</span>${sw('skin', SKINS)}</div>
    <div class="grp"><span>アクセ</span>${opt('acc', ACCS)}</div>
    <div class="grp"><span>アクセ色</span>${sw('accent', ACCENTS)}</div>`;
}

let candidate = null;
function rollCandidate() {
  const used = new Set(state.agents.map((a) => a.name));
  const name = pick(NAMES.filter((n) => !used.has(n))) || 'エージェント';
  candidate = { name, role: pick(Object.keys(ROLES)), look: randomLook() };
  $('#hirePreview').innerHTML = charSVG(candidate.look);
  $('#hireName').textContent = candidate.name;
  $('#hireRole').textContent = `${ROLES[candidate.role].icon} ${ROLES[candidate.role].label}`;
  const freeDesk = DESKS.findIndex((_, i) => !state.agents.some((a) => a.desk === i));
  const btn = $('#confirmHire');
  if (freeDesk < 0) { btn.disabled = true; btn.textContent = 'デスクが満席です'; }
  else if (state.coins < HIRE_COST) { btn.disabled = true; btn.textContent = `🪙 あと${HIRE_COST - state.coins}枚`; }
  else { btn.disabled = false; btn.textContent = `採用する (${HIRE_COST}🪙)`; }
}

/* =========================================================
 *  入力
 * ========================================================= */
function bindUI() {
  $('#taskType').innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${r.icon} ${r.task}</option>`).join('');
  $('#agentRole').innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${r.icon} ${r.label}</option>`).join('');

  document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.speed;
    document.querySelectorAll('.speed button').forEach((x) => x.classList.toggle('on', x === b));
  }));

  $('#autoTask').checked = state.autoTask;
  $('#autoTask').addEventListener('change', (e) => { state.autoTask = e.target.checked; });

  $('#diceBtn').addEventListener('click', () => {
    const type = $('#taskType').value;
    $('#taskTitle').value = pick(TASK_IDEAS[type]);
  });

  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#taskTitle').value.trim();
    if (!title) return;
    const assignee = $('#taskAssignee').value ? +$('#taskAssignee').value : null;
    state.tasks.push(makeTask(title, $('#taskType').value, $('#taskDiff').value, assignee));
    $('#taskTitle').value = '';
    toast(`📨 「${title}」を依頼しました`);
    dirty = true; save();
  });

  $('#queueList').addEventListener('click', (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    if (!id) return;
    state.tasks = state.tasks.filter((t) => t.id !== +id);
    dirty = true;
  });

  $('#doneList').addEventListener('click', (e) => {
    const li = e.target.closest('[data-result]');
    if (!li) return;
    const t = taskById(+li.dataset.result);
    if (!t) return;
    $('#resultTitle').textContent = `🏆 ${t.title}`;
    const m = 9 * 60 + Math.floor(t.doneAt);
    $('#resultMeta').textContent = `${ROLES[t.type].task} ・ ${DIFF[t.diff].label} ・ Day ${Math.floor(m / 1440) + 1} ${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} 納品`;
    $('#resultBody').textContent = t.result;
    openModal('#resultModal');
  });

  $('#roster').addEventListener('click', (e) => {
    const c = e.target.closest('[data-agent]');
    if (c) openAgent(+c.dataset.agent);
  });

  $('#customizer').addEventListener('click', (e) => {
    const b = e.target.closest('[data-look]');
    const a = agentById(selectedId);
    if (!b || !a) return;
    a.look = { ...a.look, [b.dataset.look]: b.dataset.val };
    renderAgentModal(); dirty = true; save();
  });
  $('#agentName').addEventListener('input', (e) => {
    const a = agentById(selectedId);
    if (a) { a.name = e.target.value.trim() || a.name; dirty = true; }
  });
  $('#agentRole').addEventListener('change', (e) => {
    const a = agentById(selectedId);
    if (a) { a.role = e.target.value; dirty = true; renderAgentModal(); }
  });

  $('#hireBtn').addEventListener('click', () => { rollCandidate(); openModal('#hireModal'); });
  $('#rerollBtn').addEventListener('click', rollCandidate);
  $('#confirmHire').addEventListener('click', () => {
    const freeDesk = DESKS.findIndex((_, i) => !state.agents.some((a) => a.desk === i));
    if (freeDesk < 0 || state.coins < HIRE_COST || !candidate) return;
    state.coins -= HIRE_COST;
    const a = makeAgent(candidate.name, candidate.role, candidate.look, freeDesk);
    a.x = 1.5; a.y = 4.5; a.tile = [1, 4]; a.energy = 100;
    state.agents.push(a);
    say(a, 'よろしくお願いします！🙇');
    toast(`🎊 ${a.name}がオフィスに加わりました！`);
    closeModals(); dirty = true; save();
  });

  let resetArmed = null;
  $('#resetBtn').addEventListener('click', () => {
    // ブラウザの confirm() を使わず、2回押しで確定する
    const btn = $('#resetBtn');
    if (!resetArmed) {
      btn.textContent = 'もう一度押すとリセット';
      resetArmed = setTimeout(() => { resetArmed = null; btn.textContent = '↺'; }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; btn.textContent = '↺';
    toast('🧹 オフィスを最初からやり直しました');
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    els.forEach((el) => el.remove()); els.clear(); timers.length = 0;
    newGame(); dirty = true;
    $('#autoTask').checked = state.autoTask;
  });

  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-close]')) closeModals();
  }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

  const fit = () => {
    const vp = $('#viewport');
    const s = Math.min(vp.clientWidth / STAGE_W, 1.4);
    $('#stage').style.transform = `scale(${s})`;
    vp.style.height = (STAGE_H * s) + 'px';
  };
  new ResizeObserver(fit).observe($('#viewport'));
  fit();

  window.addEventListener('beforeunload', save);
}

/* =========================================================
 *  メインループ
 * ========================================================= */
let last = performance.now(), uiAcc = 0, saveAcc = 0;
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (speed > 0) {
    // 速度を上げてもキャラが壁抜けしないよう細かく刻む
    const total = real * speed, n = Math.ceil(total / 0.05);
    for (let i = 0; i < n; i++) step(total / n);
  }
  renderAgents();
  uiAcc += real; saveAcc += real;
  if (uiAcc > 0.3) {
    uiAcc = 0;
    renderRoomLive(); renderUI();
    if (!$('#agentModal').hidden) renderAgentModal();
  }
  if (saveAcc > 5) { saveAcc = 0; save(); }
  requestAnimationFrame(frame);
}

if (!load()) newGame();
buildRoom();
bindUI();
renderRoomLive();
renderUI();
requestAnimationFrame(frame);
