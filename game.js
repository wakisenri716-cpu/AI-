'use strict';
/* =========================================================
 *  AIエージェント オフィス
 *  アイソメトリックなオフィスで、ちびキャラのAIエージェントが
 *  営業部・事務部に分かれてタスクを拾い、デスクで作業 → 提出するシミュレーション
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

/* ---------- 部署ごとの定義（営業部 / 事務部） ---------- */
const DEPTS = {
  sales: {
    name: '営業部', icon: '💼', boxLabel: '報告BOX', boardTitle: 'SALES BOARD', poster: ['目標達成!', '🔥📈'], mvpTitle: 'TOP SALES',
    roles: {
      inside: { label: 'インサイドセールス', task: 'アポ獲得', icon: '📞' },
      proposal: { label: '提案担当', task: '提案書', icon: '📑' },
      field: { label: 'フィールドセールス', task: '商談', icon: '🤝' },
      cs: { label: 'カスタマーサクセス', task: '既存フォロー', icon: '💐' },
    },
    ideas: {
      inside: ['リスト50件にアポ電', 'Web問い合わせに返信', '展示会リードを整理', '休眠顧客に再アプローチ', 'セミナー参加者へ架電'],
      proposal: ['A社向け提案書を作成', '見積書を作成', '導入事例スライドを更新', '料金比較表を作成', 'RFPへの回答書'],
      field: ['B社と初回商談', 'C社へクロージング', '新規エリアを訪問', '決裁者プレゼン', 'オンライン商談'],
      cs: ['既存顧客の定例MTG', '解約防止ヒアリング', 'アップセル提案', '導入後アンケート', '活用セミナー開催'],
    },
    workLines: {
      inside: ['お世話になっております📞', '担当者さまいらっしゃいますか', 'アポ取れた！', '折り返し待ち…', 'リスト消化中'],
      proposal: ['課題を整理して…', '見出し決まった！', '数字で語ろう📊', '誤字チェック✓', 'いい事例ある！'],
      field: ['御社の課題は…', '前向きに検討とのこと！', '決裁者に響いた✨', '値引きは…ちょっと', '握手🤝'],
      cs: ['使いこなせてますか？', '要望メモメモ📝', '満足度アップ↑', 'ご活用ありがとうございます', '次回もよろしくです'],
    },
    chats: [['今月あと何件？', 'あと3件で達成！'], ['A社どうだった？', '前向きです✨'], ['アポ取れた〜', 'さすが！'], ['お客さん来社だって', '会議室とっとくね']],
    theme: { floorA: '#efd2aa', floorB: '#e9c89c', floorLine: '#e2bd8e', wallL: '#fbe9d6', wallR: '#f5dcc3', base: '#d9a47a', baseR: '#c99268', rug: '#ffd9c7', sofa: '#ff9fbf', desk: '#e2b07c', deskBody: '#c48e5c', accent: '#ff7aa8' },
  },
  admin: {
    name: '事務部', icon: '🗂️', boxLabel: '書類トレー', boardTitle: 'TASK BOARD', poster: ['整理整頓', '✨🗂️'], mvpTitle: 'MVP',
    roles: {
      account: { label: '経理', task: '経理', icon: '🧾' },
      general: { label: '総務', task: '総務', icon: '📦' },
      hr: { label: '人事', task: '人事', icon: '🪪' },
      legal: { label: '法務', task: '法務', icon: '⚖️' },
    },
    ideas: {
      account: ['請求書を発行', '経費精算をチェック', '月次の仕訳を入力', '入金消込', '支払い予定表を更新'],
      general: ['備品を発注', '会議室の予約を整理', '社内イベントの準備', '名刺を手配', '防災用品を点検'],
      hr: ['勤怠を締める', '入社手続き', '給与計算を確認', '求人票を更新', '年末調整の案内'],
      legal: ['契約書をチェック', 'NDAを締結', '就業規則を改訂', '利用規約の見直し', '押印申請を処理'],
    },
    workLines: {
      account: ['電卓パチパチ🧮', '1円合わない…', '仕訳完了✓', '領収書どこ〜', '締め日まであと少し'],
      general: ['在庫チェック📦', '発注しました！', '会議室ダブってる…', 'ラベル貼り貼り', '備品足りてる？'],
      hr: ['勤怠ポチポチ', '書類そろった✓', '入社日決定！', '有給残数確認…', 'ようこそ〜🌸'],
      legal: ['この条項は…🤔', '赤入れ中✍️', 'リスクなし✓', '押印お願いします', '最新の法改正確認'],
    },
    chats: [['今日締め日だっけ？', '明日です〜'], ['コピー機また詰まった', '直しとくね'], ['新しい人いつ来るの？', '来週の月曜！'], ['ハンコ持ってる？', 'はいどうぞ']],
    theme: { floorA: '#e3ebf2', floorB: '#d8e3ec', floorLine: '#c9d7e3', wallL: '#f1f6fa', wallR: '#e3edf4', base: '#a9bccb', baseR: '#97adbf', rug: '#cdeedd', sofa: '#8fc8ff', desk: '#f3f5f8', deskBody: '#c4cdd8', accent: '#4f9be0' },
  },
};
const DEPT_KEYS = Object.keys(DEPTS);

const DIFF = {
  easy:   { label: '★',   work: 22 },
  normal: { label: '★★',  work: 42 },
  hard:   { label: '★★★', work: 70 },
};
const IDLE_LINES = ['ひまだな〜', '次のタスクまだかな', 'ストレッチ〜🙆', '今日もがんばろ', 'ふんふふ〜ん♪', '🌸'];
const CHATS = [
  ['おつかれ〜！', 'おつかれさま✨'], ['コーヒー飲んだ？', '3杯目です☕'], ['新しいタスクまだかな', 'のんびりしよ〜'],
  ['そのアクセかわいいね', 'ありがと💕'], ['最近どう？', 'レベル上げ中！'], ['お昼なに食べる？', 'カレー🍛'], ['いい天気だね', '窓きれい〜'],
];
const NAMES = ['アイ', 'クロ', 'ミク', 'ジェミ', 'ポン', 'ソラ', 'ルナ', 'テツ', 'ハル', 'ココ', 'ユウ', 'リン', 'ノア', 'モモ', 'レオ', 'ナギ', 'チャピ', 'ラマ', 'サク', 'メイ'];

const SKINS = ['#ffe3cc', '#f9d2b3', '#eab793', '#c98f68', '#8e5b3c'];
const HAIRS = ['#3b2a20', '#7a4a2a', '#e9b95c', '#f6a6c4', '#7fb6ff', '#a184ff', '#57cfae', '#ececf2', '#ff7b5a', '#26232b'];
const OUTFITS = ['#ff8fb1', '#7ec4ff', '#8fe3a3', '#ffd166', '#c49bff', '#ffa36c', '#5f6caf', '#f5f5f5', '#3a3f52'];
const ACCENTS = ['#ff6b9a', '#ffd23f', '#4dc3ff', '#7ae582', '#b18cff', '#ffffff'];
const STYLES = { short: 'ショート', long: 'ロング', bob: 'ボブ', twin: 'ツイン', spiky: 'ツンツン', bun: 'おだんご' };
const ACCS = { none: 'なし', antenna: 'アンテナ', headphones: 'ヘッドホン', glasses: 'メガネ', ribbon: 'リボン', neko: 'ネコミミ' };

/* ---------- 部屋レイアウト（両部署で共通の間取り） ---------- */
const DESKS = [[2, 3], [4, 3], [6, 3], [2, 6], [4, 6], [6, 6]];
const COFFEE_SPOTS = [[8, 1], [7, 1], [9, 1]];
const OUTBOX_SPOTS = [[1, 4], [1, 3], [1, 5]];
const SOFA_SPOTS = [[1, 7], [1, 8]];

// shelf / feature は部署ごとに見た目が変わる（営業：トロフィー棚・売上ボード、事務：書庫・コピー機）
const FURNITURE = [
  { kind: 'shelf', x: 2, y: 0 }, { kind: 'shelf', x: 3, y: 0 },
  { kind: 'feature', x: 5, y: 0 },
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
function furnitureSVG(f, key) {
  const th = DEPTS[key].theme;
  switch (f.kind) {
    case 'desk': {
      let s = box(0.1, 0.18, 0.8, 0.64, 20, 0, th.deskBody);
      s += box(0.04, 0.1, 0.92, 0.8, 4, 20, th.desk);
      if (key === 'sales') {
        // 卓上電話
        s += box(0.1, 0.55, 0.2, 0.24, 4, 24, '#3d4252');
        s += box(0.12, 0.57, 0.08, 0.2, 3, 28, '#5a6072');
      } else {
        // 書類の山とバインダー
        s += box(0.1, 0.52, 0.18, 0.26, 7, 24, '#fffdf5');
        s += box(0.75, 0.52, 0.08, 0.26, 14, 24, '#4f9be0');
      }
      s += box(0.3, 0.34, 0.36, 0.28, 2, 24, '#cfd4dc');
      s += poly([[0.3, 0.62, 26], [0.66, 0.62, 26], [0.68, 0.64, 40], [0.32, 0.64, 40]], '#a7afbd');
      const [lx, ly] = L(0.49, 0.63, 33);
      s += `<ellipse cx="${lx}" cy="${ly}" rx="2.6" ry="2.4" fill="currentColor" opacity=".9"/>`;
      s += box(0.74, 0.2, 0.1, 0.1, 7, 24, '#ffffff');
      return s;
    }
    case 'shelf': {
      if (key === 'admin') {
        // 書庫キャビネット
        let s = box(0.06, 0.04, 0.9, 0.46, 74, 0, '#b8c4d0');
        for (let r = 0; r < 4; r++) {
          const z = 6 + r * 17;
          s += poly([[0.12, 0.505, z], [0.9, 0.505, z], [0.9, 0.505, z + 14], [0.12, 0.505, z + 14]], '#cdd7e1');
          const [hx, hy] = L(0.51, 0.505, z + 7);
          s += `<rect x="${hx - 5}" y="${hy - 1.5}" width="10" height="3" rx="1.5" fill="#7f8fa0"/>`;
        }
        return s;
      }
      // トロフィー棚
      let s = box(0.06, 0.04, 0.9, 0.46, 74, 0, '#a8774a');
      [8, 32, 54].forEach((z, r) => {
        for (let i = 0; i < 3; i++) {
          const [cx, cy] = L(0.22 + i * 0.28, 0.4, z);
          const gold = (i + r) % 3 === 1 ? '#d6dbe3' : '#ffcf4d';
          s += `<rect x="${cx - 3}" y="${cy - 4}" width="6" height="4" fill="#7a5233"/>`;
          s += `<rect x="${cx - 1}" y="${cy - 9}" width="2" height="5" fill="${gold}"/>`;
          s += `<path d="M${cx - 5},${cy - 17} h10 q0,8 -5,8 q-5,0 -5,-8z" fill="${gold}"/>`;
        }
      });
      return s;
    }
    case 'feature': {
      if (key === 'admin') {
        // コピー機
        let s = box(0.1, 0.1, 0.8, 0.6, 44, 0, '#e8ecf1');
        s += box(0.14, 0.14, 0.72, 0.52, 5, 44, '#9aa6b5');
        s += box(0.9, 0.25, 0.2, 0.35, 3, 26, '#ffffff');
        s += poly([[0.16, 0.705, 8], [0.86, 0.705, 8], [0.86, 0.705, 22], [0.16, 0.705, 22]], '#d3dae3');
        const [cx, cy] = L(0.75, 0.705, 36);
        s += `<circle class="led" cx="${cx}" cy="${cy}" r="2" fill="#5fffb0"/>`;
        const [tx, ty] = L(0.5, 0.4, 66);
        s += `<text x="${tx}" y="${ty}" font-size="9" font-weight="800" text-anchor="middle" fill="#7f8fa0">COPY</text>`;
        return s;
      }
      // 売上ボード（スタンド式ホワイトボード）
      let s = box(0.15, 0.4, 0.06, 0.06, 26, 0, '#8a94a6') + box(0.8, 0.4, 0.06, 0.06, 26, 0, '#8a94a6');
      s += poly([[0.05, 0.47, 24], [0.95, 0.47, 24], [0.95, 0.47, 86], [0.05, 0.47, 86]], '#ffffff', 'stroke="#b9c3d6" stroke-width="2"');
      [18, 26, 22, 34, 40].forEach((h, i) => {
        const x = 0.15 + i * 0.15;
        s += poly([[x, 0.47, 32], [x + 0.09, 0.47, 32], [x + 0.09, 0.47, 32 + h], [x, 0.47, 32 + h]], i === 4 ? '#ff7aa8' : '#ffc2d6');
      });
      const [tx, ty] = L(0.5, 0.47, 92);
      s += `<text x="${tx}" y="${ty}" font-size="8" font-weight="800" text-anchor="middle" fill="#ff7aa8">受注件数</text>`;
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
      const c = th.accent;
      let s = box(0.12, 0.15, 0.7, 0.66, 36, 0, shade(c, 0.25));
      s += poly([[0.82, 0.3, 26], [0.82, 0.66, 26], [0.82, 0.66, 30], [0.82, 0.3, 30]], shade(c, -0.4));
      const [tx, ty] = L(0.45, 0.48, 58);
      s += `<rect x="${tx - 27}" y="${ty - 11}" width="54" height="16" rx="8" fill="#fff" stroke="${c}" stroke-width="1.5"/>`;
      s += `<text x="${tx}" y="${ty + 1}" font-size="9" font-weight="800" text-anchor="middle" fill="${shade(c, -0.4)}">${DEPTS[key].boxLabel}</text>`;
      return s;
    }
    case 'sofa': {
      const c = th.sofa;
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

function roomSVG(key) {
  const dp = DEPTS[key], th = dp.theme;
  let s = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop id="sky1" offset="0" stop-color="#8fd3ff"/><stop id="sky2" offset="1" stop-color="#d8f1ff"/></linearGradient></defs>';
  const W = (list, fill, extra = '') => `<polygon points="${list.map(([x, y, z]) => P(x, y, z).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  s += W([[0, 0, 0], [0, N, 0], [0, N, WALL], [0, 0, WALL]], th.wallL);
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, WALL], [0, 0, WALL]], th.wallR);
  s += W([[0, 0, 0], [0, N, 0], [0, N, 9], [0, 0, 9]], th.base);
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, 9], [0, 0, 9]], th.baseR);
  s += W([[0, N, WALL], [0, 0, WALL], [-0.25, -0.25, WALL], [-0.25, N, WALL]], '#fffaf4');
  s += W([[0, 0, WALL], [N, 0, WALL], [N, -0.25, WALL], [-0.25, -0.25, WALL]], '#fffaf4');

  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
    s += W([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => [a, b, 0]), (x + y) % 2 ? th.floorB : th.floorA, `stroke="${th.floorLine}" stroke-width=".6"`);
  }
  s += W([[2.6, 7.4, 0], [7.6, 7.4, 0], [7.6, 9.5, 0], [2.6, 9.5, 0]], th.rug);
  s += W([[2.85, 7.6, 0], [7.35, 7.6, 0], [7.35, 9.3, 0], [2.85, 9.3, 0]], 'none', 'stroke="#fff" stroke-width="2" stroke-dasharray="6 5"');

  // 右の壁（y=0 平面）: (u,v) -> (u, 0.5u + v)
  const [rx, ry] = P(0, 0, 0);
  s += `<g transform="matrix(1,0.5,0,1,${rx},${ry})">
    <rect x="58" y="-142" width="80" height="58" rx="4" fill="url(#sky)" stroke="#fff" stroke-width="5"/>
    <g id="stars" opacity="0"><circle cx="75" cy="-128" r="1.3" fill="#fff"/><circle cx="110" cy="-118" r="1" fill="#fff"/><circle cx="124" cy="-132" r="1.4" fill="#fff"/><circle cx="90" cy="-104" r="1" fill="#fff"/></g>
    <circle id="sun" cx="118" cy="-126" r="7" fill="#fff3a6"/>
    <path d="M98,-142 L98,-84 M58,-113 L138,-113" stroke="#fff" stroke-width="3"/>
    <ellipse cx="74" cy="-96" rx="10" ry="4" fill="#fff" opacity=".85"/>
    <circle cx="218" cy="-112" r="15" fill="#fff" stroke="${th.baseR}" stroke-width="3"/>
    <line id="hourHand" x1="218" y1="-112" x2="218" y2="-120" stroke="#5a4636" stroke-width="2.4" stroke-linecap="round"/>
    <line id="minHand" x1="218" y1="-112" x2="218" y2="-124" stroke="${th.accent}" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="258" y="-134" width="50" height="52" rx="3" fill="#fff" stroke="${th.base}" stroke-width="3"/>
    <text x="283" y="-121" font-size="7" font-weight="800" text-anchor="middle" fill="${th.baseR}">${dp.mvpTitle}</text>
    <text id="mvpName" x="283" y="-100" font-size="10" font-weight="800" text-anchor="middle" fill="${th.accent}">-</text>
    <text x="283" y="-89" font-size="9" text-anchor="middle">👑</text>
  </g>`;

  // 左の壁（x=0 平面）: (u,v) -> (u, -0.5u + v)
  const [lx, ly] = P(0, N, 0);
  s += `<g transform="matrix(1,-0.5,0,1,${lx},${ly})">
    <rect x="44" y="-128" width="66" height="56" rx="6" fill="#fff" stroke="${th.accent}" stroke-width="3"/>
    <text x="77" y="-108" font-size="11" font-weight="800" text-anchor="middle" fill="${th.accent}">${dp.poster[0]}</text>
    <text x="77" y="-90" font-size="16" text-anchor="middle">${dp.poster[1]}</text>
    <rect x="190" y="-138" width="112" height="70" rx="5" fill="#ffffff" stroke="#b9c3d6" stroke-width="3"/>
    <text x="246" y="-122" font-size="10" font-weight="800" text-anchor="middle" fill="#5f6caf">${dp.boardTitle}</text>
    <text id="wbQueue" x="200" y="-104" font-size="10" fill="#4a3f55">待ち 0</text>
    <text id="wbDoing" x="200" y="-90" font-size="10" fill="#4a3f55">作業中 0</text>
    <text id="wbDone" x="200" y="-76" font-size="10" fill="#4a3f55">完了 0</text>
    <path d="M262,-104 l8,-8 l8,5 l10,-12" stroke="#5fd39a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`;
  return s;
}

/* =========================================================
 *  ゲーム状態
 *  state.depts に部署ごとの agents / tasks を持ち、両部署を同時に進める。
 *  D はいま処理中の部署（シミュレーション・描画・入力はすべて D を見る）。
 * ========================================================= */
let state;
let D;
const els = new Map();
let selectedId = null;
let speed = 1;
const timers = [];

const roles = () => DEPTS[D.key].roles;
const viewing = () => D === state.depts[state.view];

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
  state = { nextId: 1, time: 0, autoTask: true, view: 'sales', depts: {} };
  const seed = {
    sales: [
      ['ハル', 'inside', { skin: '#f9d2b3', hair: '#7a4a2a', outfit: '#5f6caf', accent: '#ffd23f', style: 'short', acc: 'headphones' }],
      ['モモ', 'proposal', { skin: '#ffe3cc', hair: '#f6a6c4', outfit: '#ff8fb1', accent: '#ff6b9a', style: 'bob', acc: 'ribbon' }],
      ['レオ', 'field', { skin: '#eab793', hair: '#26232b', outfit: '#3a3f52', accent: '#4dc3ff', style: 'spiky', acc: 'none' }],
      ['ソラ', 'cs', { skin: '#ffe3cc', hair: '#7fb6ff', outfit: '#8fe3a3', accent: '#ffffff', style: 'long', acc: 'antenna' }],
    ],
    admin: [
      ['ミク', 'account', { skin: '#ffe3cc', hair: '#57cfae', outfit: '#f5f5f5', accent: '#ff6b9a', style: 'twin', acc: 'glasses' }],
      ['アイ', 'general', { skin: '#ffe3cc', hair: '#e9b95c', outfit: '#ffd166', accent: '#7ae582', style: 'bun', acc: 'none' }],
      ['クロ', 'hr', { skin: '#f9d2b3', hair: '#3b2a20', outfit: '#7ec4ff', accent: '#b18cff', style: 'short', acc: 'neko' }],
      ['リン', 'legal', { skin: '#f9d2b3', hair: '#a184ff', outfit: '#3a3f52', accent: '#4dc3ff', style: 'long', acc: 'glasses' }],
    ],
  };
  DEPT_KEYS.forEach((key) => {
    D = state.depts[key] = { key, agents: [], tasks: [], nextAuto: rand(15, 30) };
    seed[key].forEach(([n, r, lk], i) => D.agents.push(makeAgent(n, r, lk, i)));
    const ideas = DEPTS[key].ideas;
    Object.keys(ideas).slice(0, 3).forEach((type, i) => D.tasks.push(makeTask(ideas[type][0], type, ['easy', 'normal', 'normal'][i])));
  });
  D = state.depts[state.view];
}

const SAVE_KEY = 'ai-agent-office-v2';
function save() {
  try {
    const depts = {};
    DEPT_KEYS.forEach((k) => { const d = state.depts[k]; depts[k] = { ...d, agents: d.agents.map((a) => ({ ...a, path: [], bubble: null })) }; });
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, depts }));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    state = JSON.parse(raw);
    DEPT_KEYS.forEach((k) => {
      const d = state.depts[k];
      d.agents.forEach((a) => {
        // 途中の移動は保存しないので、所属タイルに戻して再開
        if (a.sitting === 'desk') { const [dx, dy] = DESKS[a.desk]; a.tile = [dx, dy - 1]; }
        a.x = a.tile[0] + 0.5; a.y = a.tile[1] + 0.5; a.sitting = null; a.path = [];
        a.state = 'idle'; a.wait = 0; a.after = null; a.onArrive = null; a.idleT = 0.5;
      });
      d.tasks.forEach((t) => { if (t.status === 'doing' && !d.agents.some((a) => a.taskId === t.id)) { t.status = 'queued'; t.agentId = null; } });
    });
    D = state.depts[state.view];
    return true;
  } catch (e) { return false; }
}

const taskById = (id) => D.tasks.find((t) => t.id === id);
const agentById = (id) => D.agents.find((a) => a.id === id);

/* ---------- 時間差イベント（ゲーム内時間・部署を覚えておく） ---------- */
function later(delay, fn) { timers.push({ at: state.time + delay, fn, dept: D }); }

function say(a, text, dur = 2.8) {
  a.bubble = { text, until: state.time + dur };
}

function floatText(x, y, text) {
  if (!viewing()) return;
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
  const box = $('#toasts');
  box.appendChild(d);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => d.remove(), 3300);
}
// 見ていない部署の出来事は部署名つきで通知
const deptToast = (text) => toast(viewing() ? text : `${DEPTS[D.key].icon}${DEPTS[D.key].name}：${text}`);

/* =========================================================
 *  エージェントの行動
 * ========================================================= */
const occupied = (a, t) => D.agents.some((o) => o !== a && o.tile[0] === t[0] && o.tile[1] === t[1]);

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
  const others = D.agents.filter((b) => b !== a && b.state === 'idle' && !b.path.length && !b.sitting && !b.taskId);
  if (!others.length) return wander(a);
  const b = pick(others);
  const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [b.tile[0] + dx, b.tile[1] + dy]).find((t) => walkable(t[0], t[1]) && !occupied(a, t));
  if (!spot) return wander(a);
  b.state = 'chat'; b.wait = 8; b.waitKind = 'chat'; b.after = () => { b.state = 'idle'; };
  a.state = 'chat';
  goTo(a, spot, () => {
    const [l1, l2] = pick(Math.random() < 0.5 ? DEPTS[D.key].chats : CHATS);
    const toB = (b.x - a.x) - (b.y - a.y);
    a.flip = toB < 0; b.flip = !a.flip;
    say(a, l1, 2.2);
    later(1.8, () => say(b, l2, 2.4));
    a.wait = 4.2; a.waitKind = 'chat'; a.after = () => { a.state = 'idle'; a.idleT = rand(1, 3); };
    b.wait = 4.2; b.after = () => { b.state = 'idle'; b.idleT = rand(1, 3); };
  });
}

function pickTask(a) {
  // 急ぎのタスクを先に拾う
  const queued = D.tasks.filter((t) => t.status === 'queued').sort((x, y) => (y.urgent ? 1 : 0) - (x.urgent ? 1 : 0));
  return queued.find((t) => t.assignee === a.id)
    || queued.find((t) => !t.assignee && t.type === a.role)
    || queued.find((t) => !t.assignee && !D.agents.some((o) => o !== a && o.role === t.type && o.state === 'idle' && !o.taskId))
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
  if (!a.bubble && Math.random() < dt * 0.1) say(a, pick(DEPTS[D.key].workLines[t.type]));
  if (t.progress >= t.work) return deliver(a, t);
  if (a.energy < 10) { say(a, 'ちょっと休憩…💦'); goCoffee(a); }
}

function deliver(a, t) {
  a.state = 'deliver';
  say(a, pick(['できた！', '完了〜✨', '提出しまーす']));
  const spot = OUTBOX_SPOTS.find((s) => !occupied(a, s)) || OUTBOX_SPOTS[0];
  goTo(a, spot, () => {
    a.flip = true;
    a.wait = 1; a.waitKind = 'deliver';
    a.after = () => complete(a, t);
  });
}

function complete(a, t) {
  t.status = 'done'; t.doneAt = state.time; t.agentId = a.id; t.agentName = a.name;
  t.result = makeResult(t, a);
  a.taskId = null; a.done++;
  a.xp += t.work * 2;
  floatText(1, 4, '✅');
  deptToast(`✅ ${a.name}が「${t.title}」を完了！`);
  const need = a.level * 100;
  if (a.xp >= need) {
    a.xp -= need; a.level++;
    later(0.6, () => { say(a, `レベル${a.level}になった！🎉`, 3); floatText(a.x, a.y, 'LEVEL UP!'); });
    deptToast(`🎉 ${a.name}が Lv${a.level} にレベルアップ！`);
  } else {
    say(a, pick(['ふぅ、おわり！', '次いこ〜', 'お役に立てたかな？']));
  }
  a.state = 'idle'; a.idleT = 1;
  dirty = true;
}

function makeResult(t, a) {
  const R = roles()[t.type];
  const n = (lo = 3, hi = 9) => Math.floor(rand(lo, hi));
  const yen = () => `${n(12, 98) * 10}万円`;
  const bodies = {
    inside: [
      `■ 架電結果\n・コール数：${n(30, 60)}件\n・接続：${n(10, 20)}件\n・アポ獲得：${n(2, 6)}件（うち決裁者アポ ${n(1, 3)}件）`,
      `■ 次のアクション\n・資料送付 ${n(3, 8)}件 → 来週フォロー\n・${pick(['リストを業種別に再整理', 'トークスクリプトを改善', '架電時間帯を午前に変更'])}`,
    ],
    proposal: [
      `■ 提案の骨子\n1. 現状の課題：${pick(['手作業の多さ', '情報の属人化', '問い合わせ対応の遅れ'])}\n2. 解決策：自社サービスの導入\n3. 効果：工数 ${n(20, 50)}% 削減見込み`,
      `■ お見積り\n・初期費用：${yen()}\n・月額：${n(3, 15)}万円\n・スライド ${n(8, 20)} 枚で作成済み`,
    ],
    field: [
      `■ 商談メモ\n・参加者：${pick(['部長・課長', '社長', '情報システム部の2名'])}\n・温度感：${pick(['◎ 前向き', '○ 検討中', '△ 予算次第'])}\n・懸念点：${pick(['導入スケジュール', '既存ツールとの連携', '費用対効果'])}`,
      `■ 見込み\n・受注確度：${n(4, 9) * 10}%\n・想定金額：${yen()}\n・次回：${pick(['来週デモ', '稟議用資料を送付', '契約書ドラフト送付'])}`,
    ],
    cs: [
      `■ ヒアリング結果\n・満足度：${pick(['★★★★★', '★★★★☆', '★★★☆☆'])}\n・よく使う機能：${pick(['レポート', '自動通知', 'データ連携'])}\n・要望：${pick(['スマホ対応', 'CSV出力', '権限設定の細分化'])}`,
      `■ 対応\n・${pick(['活用勉強会を提案', '上位プランを案内', '開発チームに要望を共有'])}\n・解約リスク：${pick(['低', '中 → 来月再フォロー', '低（継続意向あり）'])}`,
    ],
    account: [
      `■ 処理内容\n・対象：${n(10, 60)}件\n・合計金額：${n(100, 900)}万円\n・差異：${pick(['なし ✓', '1件（確認済み）', 'なし（照合完了）'])}`,
      `■ メモ\n・${pick(['インボイス番号の記載漏れ 1件を差し戻し', '期日どおり処理完了', '来月から電子化予定'])}`,
    ],
    general: [
      `■ 対応内容\n・${t.title}：完了\n・手配先：${pick(['いつもの業者さん', 'ネット通販', '総務部長に確認済み'])}\n・費用：${n(1, 9)}万${n(1, 9)}千円`,
      `■ 共有事項\n・${pick(['在庫表を更新しました', '社内チャットで告知済み', '次回は月末に点検予定'])}`,
    ],
    hr: [
      `■ 処理状況\n・対象者：${n(5, 40)}名\n・不備：${pick(['なし ✓', '2名分を本人に確認中', 'なし（全員提出済み）'])}`,
      `■ 次の予定\n・${pick(['入社オリエンを来週月曜に実施', '給与明細は25日に配信', '求人媒体に掲載予定'])}`,
    ],
    legal: [
      `■ レビュー結果\n・確認条項：${n(10, 30)}条\n・修正提案：${n(1, 5)}か所（${pick(['損害賠償の上限', '再委託の条件', '秘密保持の期間'])}など）`,
      `■ 判定\n・${pick(['このまま締結OK', '修正後に締結OK', '先方と再交渉が必要'])}\n・保管先：契約書フォルダ`,
    ],
  };
  return `${R.icon} ${t.title}\n担当：${a.name}（Lv${a.level} ${roles()[a.role].label}）\n\n${bodies[t.type].join('\n\n')}`;
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

  // 文で「休憩して」と言われていたら、作業の区切りで向かう
  if (a.pending && (a.state === 'work' || a.state === 'idle')) {
    const kind = a.pending; a.pending = null;
    say(a, kind === 'sofa' ? 'はーい、ひと休みします' : 'コーヒー行ってきます☕');
    return kind === 'sofa' ? goSofa(a) : goCoffee(a);
  }
  if (a.state === 'work') return work(a, dt);
  if (a.state === 'idle') return think(a, dt);
  // 想定外の状態からは idle に復帰
  if (!a.path.length && a.wait <= 0) a.state = 'idle';
}

function autoTasks(dt) {
  if (!state.autoTask) return;
  D.nextAuto -= dt;
  if (D.nextAuto > 0) return;
  D.nextAuto = rand(18, 38);
  if (D.tasks.filter((t) => t.status === 'queued').length >= 6) return;
  const ideas = DEPTS[D.key].ideas;
  const type = pick(Object.keys(ideas));
  const diff = pick(['easy', 'easy', 'normal', 'normal', 'hard']);
  const t = makeTask(pick(ideas[type]), type, diff);
  D.tasks.push(t);
  if (viewing()) toast(`📨 新しい依頼：「${t.title}」`);
  dirty = true;
}

function step(dt) {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i].dept === D && timers[i].at <= state.time) { const t = timers.splice(i, 1)[0]; t.fn(); }
  }
  D.agents.forEach((a) => updateAgent(a, dt));
  autoTasks(dt);
  // 完了ログは最新 40 件だけ残す
  const done = D.tasks.filter((t) => t.status === 'done').sort((x, y) => x.doneAt - y.doneAt);
  if (done.length > 40) { const drop = new Set(done.slice(0, done.length - 40).map((t) => t.id)); D.tasks = D.tasks.filter((t) => !drop.has(t.id)); }
}

/* =========================================================
 *  描画
 * ========================================================= */
function buildRoom() {
  els.forEach((el) => el.remove()); els.clear();
  $('#fx').innerHTML = '';
  $('#room').innerHTML = roomSVG(D.key);
  const layer = $('#entities');
  layer.innerHTML = '';
  FURNITURE.forEach((f) => {
    const d = document.createElement('div');
    d.className = 'furn';
    const [sx, sy] = P(f.x, f.y);
    d.style.transform = `translate(${sx}px,${sy}px)`;
    d.style.zIndex = Math.round((f.x + f.y + ((f.w || 1) + (f.d || 1)) / 2) * 100);
    d.innerHTML = `<svg width="1" height="1">${furnitureSVG(f, D.key)}</svg>`;
    if (f.kind === 'desk') d.dataset.desk = f.desk;
    layer.appendChild(d);
  });
  document.documentElement.style.setProperty('--dept', DEPTS[D.key].theme.accent);
  dirty = true;
}

function syncDeskColors() {
  document.querySelectorAll('.furn[data-desk]').forEach((d) => {
    const owner = D.agents.find((a) => a.desk === +d.dataset.desk);
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
  D.agents.forEach((a) => {
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
  const queued = D.tasks.filter((t) => t.status === 'queued');
  const doing = D.tasks.filter((t) => t.status === 'doing');
  const done = D.tasks.filter((t) => t.status === 'done').sort((x, y) => x.doneAt - y.doneAt);
  const totalDone = D.agents.reduce((s, a) => s + a.done, 0);

  $('#doneCount').textContent = DEPT_KEYS.reduce((s, k) => s + state.depts[k].agents.reduce((x, a) => x + a.done, 0), 0);
  $('#wbQueue').textContent = `待ち ${queued.length}`;
  $('#wbDoing').textContent = `作業中 ${doing.length}`;
  $('#wbDone').textContent = `完了 ${totalDone}`;
  const mvp = D.agents.slice().sort((a, b) => b.done - a.done)[0];
  $('#mvpName').textContent = mvp && mvp.done ? mvp.name : '-';

  // 部署タブ
  $('#deptTabs').innerHTML = DEPT_KEYS.map((k) => {
    const d = state.depts[k], dp = DEPTS[k];
    const busy = d.tasks.filter((t) => t.status === 'doing').length;
    const wait = d.tasks.filter((t) => t.status === 'queued').length;
    return `<button class="tab${k === state.view ? ' on' : ''}" data-dept="${k}" style="--c:${dp.theme.accent}">
      <span class="ti">${dp.icon}</span><b>${dp.name}</b><small>作業中 ${busy} ・ 待ち ${wait}</small></button>`;
  }).join('');

  $('#doingList').innerHTML = doing.length ? doing.map((t) => {
    const a = agentById(t.agentId);
    return `<li><span>${roles()[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(a ? a.name : '')}</span><span class="mini"><i style="width:${(t.progress / t.work * 100).toFixed(0)}%"></i></span></li>`;
  }).join('') : '<li class="empty">いまは誰も作業していません</li>';

  $('#roster').innerHTML = D.agents.map((a) => `
    <div class="chip" data-agent="${a.id}">
      <div class="face">${charSVG(a.look)}</div>
      <b>${esc(a.name)} <small>Lv${a.level}</small></b>
      <span class="role">${roles()[a.role].icon} ${roles()[a.role].label}</span>
      <span>${statusText(a)}</span>
      <div class="en"><i style="width:${a.energy.toFixed(0)}%"></i></div>
    </div>`).join('');

  if (!dirty) return;
  dirty = false;
  syncDeskColors();

  const dp = DEPTS[D.key];
  document.querySelectorAll('[data-deptname]').forEach((e) => { e.textContent = dp.name; });
  $('#queueCount').textContent = queued.length ? `(${queued.length})` : '';
  $('#queueList').innerHTML = queued.length ? queued.map((t) => {
    const who = t.assignee ? agentById(t.assignee) : null;
    return `<li><span>${roles()[t.type].icon}</span><span class="t">${t.urgent ? '🔥' : ''}${esc(t.title)}</span><span class="meta">${DIFF[t.diff].label}${who ? ' → ' + esc(who.name) : ''}</span><button class="x" data-del="${t.id}" title="取り消す">✕</button></li>`;
  }).join('') : '<li class="empty">依頼待ちのタスクはありません</li>';

  $('#doneList').innerHTML = done.length ? done.slice().reverse().map((t) =>
    `<li class="clickable" data-result="${t.id}"><span>${roles()[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(t.agentName || '')} ${DIFF[t.diff].label}</span></li>`
  ).join('') : '<li class="empty">まだ完了したタスクはありません</li>';

  const typeSel = $('#taskType');
  if (typeSel.dataset.dept !== D.key) {
    typeSel.dataset.dept = D.key;
    typeSel.innerHTML = Object.entries(roles()).map(([k, r]) => `<option value="${k}">${r.icon} ${r.task}</option>`).join('');
    $('#taskTitle').placeholder = `例：${dp.ideas[Object.keys(dp.ideas)[0]][0]}`;
  }
  const sel = $('#taskAssignee'), cur = sel.value;
  sel.innerHTML = '<option value="">担当：おまかせ</option>' + D.agents.map((a) => `<option value="${a.id}">担当：${esc(a.name)}（${roles()[a.role].label}）</option>`).join('');
  sel.value = D.agents.some((a) => String(a.id) === cur) ? cur : '';
  $('#hireBtn').disabled = D.agents.length >= DESKS.length;
  $('#hireBtn').textContent = D.agents.length >= DESKS.length ? 'デスク満席' : '＋ 採用';
}

function statusText(a) {
  const t = taskById(a.taskId);
  switch (a.state) {
    case 'work': return `💻 ${t ? t.title : '作業中'}`;
    case 'toDesk': return '🚶 デスクへ';
    case 'deliver': return '📦 提出中';
    case 'coffee': return '☕ コーヒー休憩';
    case 'sofa': return '🛋️ ひと休み';
    case 'chat': return '💬 おしゃべり';
    case 'walk': return '🚶 おさんぽ';
    default: return t ? '⏸ 作業待ち' : '😊 ひま';
  }
}

function switchDept(key) {
  if (key === state.view) return;
  closeModals();
  state.view = key;
  D = state.depts[key];
  buildRoom();
  renderRoomLive();
  renderUI();
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
  $('#agentNameErr').textContent = '';
  renderAgentModal();
  openModal('#agentModal');
}

function renderAgentModal() {
  const a = agentById(selectedId);
  if (!a) return;
  $('#agentPreview').innerHTML = charSVG(a.look);
  if (document.activeElement !== $('#agentName')) $('#agentName').value = a.name;
  const rs = $('#agentRole');
  if (rs.dataset.dept !== D.key) {
    rs.dataset.dept = D.key;
    rs.innerHTML = Object.entries(roles()).map(([k, r]) => `<option value="${k}">${r.icon} ${r.label}</option>`).join('');
  }
  rs.value = a.role;
  $('#agentLv').textContent = a.level;
  $('#agentXp').style.width = (a.xp / (a.level * 100) * 100) + '%';
  $('#agentEnergy').style.width = a.energy + '%';
  $('#agentStatus').textContent = statusText(a);
  $('#agentDone').textContent = `${DEPTS[D.key].name} ・ これまでの完了：${a.done}件 ・ デスク #${a.desk + 1}`;

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
  candidate = { role: pick(Object.keys(roles())), look: randomLook() };
  $('#hirePreview').innerHTML = charSVG(candidate.look);
  // 自分で入力した名前は「別の候補」を押しても残す
  if (!$('#hireNameInput').dataset.typed) $('#hireNameInput').value = unusedName();
  $('#hireErr').textContent = '';
  $('#hireRole').textContent = `${DEPTS[D.key].icon} ${DEPTS[D.key].name} ・ ${roles()[candidate.role].icon} ${roles()[candidate.role].label}`;
  const freeDesk = DESKS.findIndex((_, i) => !D.agents.some((a) => a.desk === i));
  const btn = $('#confirmHire');
  btn.disabled = freeDesk < 0;
  btn.textContent = freeDesk < 0 ? 'デスクが満席です' : `${DEPTS[D.key].name}に採用する`;
}

/* =========================================================
 *  名前のルール
 * ========================================================= */
const allAgents = () => DEPT_KEYS.flatMap((k) => state.depts[k].agents.map((a) => ({ a, dept: k })));

function nameError(name, self = null) {
  if (!name) return '名前を入力してください';
  if (name.length > 8) return '名前は8文字以内にしてください';
  if (/[\s、。,.!！?？「」]/.test(name)) return '名前に空白や記号は使えません';
  const dup = allAgents().find(({ a }) => a !== self && a.name === name);
  if (dup) return `「${name}」は${DEPTS[dup.dept].name}にすでにいます`;
  return null;
}

function unusedName() {
  const used = new Set(allAgents().map(({ a }) => a.name));
  return pick(NAMES.filter((n) => !used.has(n))) || `エージェント${state.nextId}`;
}

/* 指定した部署にエージェントを採用する（ボタンからも文からも使う） */
function hireAgent(deptKey, name, role, look) {
  const d = state.depts[deptKey];
  const freeDesk = DESKS.findIndex((_, i) => !d.agents.some((a) => a.desk === i));
  if (freeDesk < 0) return null;
  const a = makeAgent(name, role, look, freeDesk);
  a.x = 1.5; a.y = 4.5; a.tile = [1, 4]; a.energy = 100;
  d.agents.push(a);
  a.bubble = { text: 'よろしくお願いします！🙇', until: state.time + 3 };
  dirty = true;
  return a;
}

/* =========================================================
 *  文での指示
 *  例）「ハルにC社へアポ電して」「事務部で請求書の発行を急ぎでお願い」
 *      「ミクの名前をミクリンに変えて」「営業部にサクラって子を採用して」
 *      「みんなコーヒー休憩して」
 *  ルールベースで「誰に・どの部署で・何を・どのくらい」を読み取る。
 * ========================================================= */
const TYPE_WORDS = {
  inside: ['テレアポ', 'アポ', '架電', '電話', '問い合わせ', '問合せ', 'リード', 'リスト', 'コール'],
  proposal: ['提案書', '提案', '見積', '資料', 'スライド', 'RFP', '企画書'],
  field: ['商談', '訪問', 'クロージング', 'プレゼン', '打ち合わせ', '打合せ', '受注', '営業に行'],
  cs: ['フォロー', '既存', '解約', 'アップセル', 'ヒアリング', 'アンケート', 'サポート', '定例'],
  account: ['請求', '経費', '仕訳', '入金', '支払', '経理', '精算', '領収書', '予算', '決算', '税'],
  general: ['備品', '発注', '会議室', 'イベント', '名刺', '総務', '掃除', '点検', '手配', '郵便'],
  hr: ['勤怠', '入社', '給与', '求人', '人事', '有給', '年末調整', '面接', '研修', '採用'],
  legal: ['契約', 'NDA', '規約', '規程', '法務', '押印', '法律', 'コンプラ', '特許'],
};
const ROLE_DEPT = {};
DEPT_KEYS.forEach((k) => Object.keys(DEPTS[k].roles).forEach((r) => { ROLE_DEPT[r] = k; }));

const HONORIFIC = '(?:さん|くん|君|ちゃん|氏)?';
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 「アイデア」の中の「アイ」のような誤爆を避けるため、名前の直後にカタカナが続くときは一致とみなさない
function findAgentIn(text) {
  return allAgents().sort((x, y) => y.a.name.length - x.a.name.length)
    .find(({ a }) => new RegExp(reEsc(a.name) + '(?![ァ-ヶー])').test(text)) || null;
}

function deptIn(text) {
  if (/営業部|営業の(人|みんな|誰か)|営業チーム/.test(text)) return 'sales';
  if (/事務部|事務の(人|みんな|誰か)|事務チーム|事務方/.test(text)) return 'admin';
  return null;
}

function scoreTypes(text, onlyDept) {
  let best = null, bestScore = 0;
  Object.entries(TYPE_WORDS).forEach(([type, words]) => {
    if (onlyDept && ROLE_DEPT[type] !== onlyDept) return;
    const score = words.reduce((s, w) => s + (text.includes(w) ? w.length : 0), 0);
    if (score > bestScore) { best = type; bestScore = score; }
  });
  return best;
}

const U_ROW = { か: 'く', が: 'ぐ', さ: 'す', た: 'つ', な: 'ぬ', ば: 'ぶ', ま: 'む', ら: 'る', わ: 'う' };
const TAIL = ['してもらえますか', 'してもらえる', 'してくれる', 'してください', 'して下さい', 'しておいて', 'しといて', 'してほしい', 'して欲しい',
  'お願いします', 'お願いね', 'お願い', 'よろしくね', 'よろしく', '頼みます', '頼んだ', '頼む', 'やっておいて', 'やっといて', 'やって',
  'つくって', '作って', '書いて', 'まとめて', '進めて', '考えて', '調べて', '送って', '出して', '直して', '片付けて', '用意して', '済ませて', '終わらせて',
  'ください', '下さい', 'して', 'する', 'おいて', 'ね', 'よ', 'を', 'に', 'は', 'で', 'が', 'の', 'も', '、', ',', ' ', '　'];

function cleanTitle(text, agentName) {
  let t = text;
  if (agentName) t = t.replace(new RegExp(reEsc(agentName) + HONORIFIC + '(?:に|へ|は|が|で|、|,)?'), '');
  t = t.replace(/(営業部|事務部|営業チーム|事務チーム)(?:の(?:人|みんな|誰か))?(?:で|に|へ|は|から|、)?/g, '');
  t = t.replace(/^(営業|事務)の(人|みんな|誰か)(に|へ|で|は)?/, '');
  t = t.replace(/(大至急|至急|急ぎで|急いで|急ぎ|最優先で|最優先|なるはやで|なるはや|すぐに|サクッと|さくっと|軽く|簡単に|簡単な|じっくり|しっかり|丁寧に|ちゃんと)/g, '');
  t = t.replace(/させ(て|る)/g, 'する').replace(/([かがさたなばまらわ])せ(て|る)$/, (_, k) => U_ROW[k]);
  t = t.replace(/[。！!？?]+$/, '').trim();
  for (let changed = true; changed;) {
    changed = false;
    for (const s of TAIL) {
      if (t.length > s.length && t.endsWith(s)) { t = t.slice(0, -s.length).trim(); changed = true; break; }
    }
  }
  return t.slice(0, 30);
}

function interpret(raw) {
  const s = raw.trim().replace(/^(あとは|あと|それと|それから|次に|ついでに)[、,]?\s*/, '');
  if (!s) return null;
  const hit = findAgentIn(s);

  // 1) 名前の変更：「ハルの名前をタロウに変えて」「ハルをタロウに改名」
  const rn = s.match(/^(.+?)の名前を[「『]?(.+?)[」』]?(?:に|へ)(?:変えて|変更|して|改名|する)/) || s.match(/^(.+?)を[「『]?(.+?)[」』]?(?:に改名|って呼んで|と呼んで)/);
  if (rn) {
    const who = findAgentIn(rn[1]);
    if (!who) return { ok: false, text: `「${rn[1]}」という名前のエージェントが見つかりません` };
    const newName = rn[2].trim();
    const err = nameError(newName, who.a);
    if (err) return { ok: false, text: err };
    const old = who.a.name;
    who.a.name = newName;
    state.depts[who.dept].tasks.forEach((t) => { if (t.agentName === old) t.agentName = newName; });
    who.a.bubble = { text: `今日から「${newName}」です！`, until: state.time + 3 };
    dirty = true;
    return { ok: true, dept: who.dept, text: `${old} の名前を「${newName}」に変更しました` };
  }

  // 2) 採用：「営業部にサクラって子を採用して」「事務部に新しい人を入れて」
  if (/(採用|雇って|雇う|雇い|入れて|増やして|仲間に)/.test(s) && /(新しい|人|子|メンバー|エージェント|って|という|っていう|「)/.test(s) && !hit) {
    const named = s.match(/[「『](.+?)[」』]/) || s.match(/([^\s、。,をにはがで「」]+?)(?:って|という|と言う|っていう)(?:名前|子|人|メンバー|エージェント|やつ)/);
    const dept = deptIn(s) || scoreTypes(s.replace(/採用/g, '')) && ROLE_DEPT[scoreTypes(s.replace(/採用/g, ''))] || state.view;
    const role = scoreTypes(s.replace(/採用/g, ''), dept) || pick(Object.keys(DEPTS[dept].roles));
    let name = named ? named[1].trim() : unusedName();
    let note = '';
    const err = nameError(name);
    if (err) { note = `（${err}ので「${(name = unusedName())}」にしました）`; }
    const a = hireAgent(dept, name, role, randomLook());
    if (!a) return { ok: false, text: `${DEPTS[dept].name}のデスクが満席で採用できません` };
    return { ok: true, dept, text: `${DEPTS[dept].name}に「${a.name}」（${DEPTS[dept].roles[role].label}）を採用しました${note}` };
  }

  // 3) 休憩：「ハル休憩して」「みんなコーヒー休憩して」「ミクはソファで休んで」
  const typeAny = scoreTypes(s);
  if (/(休憩|休んで|休ませ|ひと休み|一休み|コーヒー|ソファ|ごろごろ|ひと息|一息)/.test(s) && !typeAny) {
    const everyone = /(みんな|全員|皆|みなさん)/.test(s);
    const dept = deptIn(s) || (hit ? hit.dept : state.view);
    const targets = everyone ? state.depts[dept].agents : hit ? [hit.a] : [];
    if (!targets.length) return { ok: false, text: '誰に休憩してもらうか、名前か「みんな」を入れてください' };
    const kind = /(ソファ|ごろごろ|横に)/.test(s) ? 'sofa' : 'coffee';
    targets.forEach((a) => { a.pending = kind; });
    const who = everyone ? `${DEPTS[dept].name}のみんな` : targets[0].name;
    return { ok: true, dept, text: `${who}に${kind === 'sofa' ? 'ソファでひと休み' : 'コーヒー休憩'}してもらいます` };
  }

  // 4) タスクの依頼
  const dept = hit ? hit.dept : deptIn(s) || (typeAny ? ROLE_DEPT[typeAny] : state.view);
  const type = scoreTypes(s, dept) || (hit ? hit.a.role : Object.keys(DEPTS[dept].roles)[0]);
  const diff = /(簡単|軽く|サクッと|さくっと|ちょっとした|すぐ終わる)/.test(s) ? 'easy'
    : /(じっくり|しっかり|丁寧|難しい|大型|大きな|重め|徹底)/.test(s) ? 'hard' : 'normal';
  const urgent = /(急ぎ|急いで|至急|最優先|なるはや|すぐに)/.test(s);
  let title = cleanTitle(s, hit && hit.a.name);
  if (title.length < 2) title = pick(DEPTS[dept].ideas[type]);
  const t = makeTask(title, type, diff, hit ? hit.a.id : null);
  t.urgent = urgent;
  state.depts[dept].tasks.push(t);
  dirty = true;
  const r = DEPTS[dept].roles[type];
  return {
    ok: true, dept,
    text: `${DEPTS[dept].name}${hit ? `の${hit.a.name}` : ''}に「${title}」を依頼しました（${r.icon}${r.task}・${DIFF[diff].label}${urgent ? '・🔥急ぎ' : ''}）`,
  };
}

const cmdLog = [];
function runCommand(raw) {
  // 「。」や改行、「あと」「それと」で区切って複数の指示をまとめて受け付ける
  const parts = raw.split(/[。！!？?\n]+|、\s*(?:あと|それと|それから|次に)、?/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return;
  const results = parts.map((p) => ({ input: p, ...(interpret(p) || { ok: false, text: '指示が空です' }) }));
  results.forEach((r) => cmdLog.unshift(r));
  cmdLog.length = Math.min(cmdLog.length, 8);
  const lastDept = results.filter((r) => r.ok && r.dept).map((r) => r.dept).pop();
  if (lastDept) switchDept(lastDept);
  renderCmdLog();
  save();
}

function renderCmdLog() {
  $('#cmdLog').innerHTML = cmdLog.map((r) => `
    <li class="${r.ok ? 'ok' : 'ng'}"><span class="q">🗣 ${esc(r.input)}</span><span class="a">${r.ok ? '→' : '⚠'} ${esc(r.text)}</span></li>`).join('');
}

function renderCmdExamples() {
  const s = state.depts.sales.agents[0], a = state.depts.admin.agents[0];
  const ex = [
    s ? `${s.name}にC社へアポ電して` : '営業部でC社へアポ電して',
    '事務部で請求書の発行を急ぎでお願い',
    a ? `${a.name}は契約書のチェックをじっくりやって` : '契約書のチェックをじっくりやって',
    '営業部にサクラって子を採用して',
    s ? `${s.name}の名前を${unusedName()}に変えて` : `ハルの名前を${unusedName()}に変えて`,
    'みんなコーヒー休憩して',
  ];
  $('#cmdExamples').innerHTML = ex.map((e) => `<button type="button" class="ex">${esc(e)}</button>`).join('');
}

/* =========================================================
 *  入力
 * ========================================================= */
function bindUI() {
  document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.speed;
    document.querySelectorAll('.speed button').forEach((x) => x.classList.toggle('on', x === b));
  }));

  $('#deptTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dept]');
    if (b) switchDept(b.dataset.dept);
  });

  $('#autoTask').checked = state.autoTask;
  $('#autoTask').addEventListener('change', (e) => { state.autoTask = e.target.checked; });

  $('#diceBtn').addEventListener('click', () => {
    $('#taskTitle').value = pick(DEPTS[D.key].ideas[$('#taskType').value]);
  });

  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#taskTitle').value.trim();
    if (!title) return;
    const assignee = $('#taskAssignee').value ? +$('#taskAssignee').value : null;
    D.tasks.push(makeTask(title, $('#taskType').value, $('#taskDiff').value, assignee));
    $('#taskTitle').value = '';
    toast(`📨 ${DEPTS[D.key].name}に「${title}」を依頼しました`);
    dirty = true; save();
  });

  $('#queueList').addEventListener('click', (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    if (!id) return;
    D.tasks = D.tasks.filter((t) => t.id !== +id);
    dirty = true;
  });

  $('#doneList').addEventListener('click', (e) => {
    const li = e.target.closest('[data-result]');
    if (!li) return;
    const t = taskById(+li.dataset.result);
    if (!t) return;
    $('#resultTitle').textContent = `🏆 ${t.title}`;
    const m = 9 * 60 + Math.floor(t.doneAt);
    $('#resultMeta').textContent = `${DEPTS[D.key].name} ・ ${roles()[t.type].task} ・ ${DIFF[t.diff].label} ・ Day ${Math.floor(m / 1440) + 1} ${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} 完了`;
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
  // 名前は確定（Enter / フォーカスが外れた）時に重複チェックして反映
  $('#agentName').addEventListener('change', (e) => {
    const a = agentById(selectedId);
    if (!a) return;
    const name = e.target.value.trim();
    const err = nameError(name, a);
    $('#agentNameErr').textContent = err || '';
    if (err) { e.target.value = a.name; return; }
    if (name !== a.name) {
      D.tasks.forEach((t) => { if (t.agentName === a.name) t.agentName = name; });
      a.name = name; say(a, `今日から「${name}」です！`);
      toast(`✏️ 名前を「${name}」に変更しました`);
      dirty = true; save(); renderCmdExamples();
    }
  });
  $('#agentName').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) e.target.blur(); });
  $('#agentRole').addEventListener('change', (e) => {
    const a = agentById(selectedId);
    if (a) { a.role = e.target.value; dirty = true; renderAgentModal(); }
  });

  $('#hireBtn').addEventListener('click', () => { delete $('#hireNameInput').dataset.typed; rollCandidate(); openModal('#hireModal'); });
  $('#rerollBtn').addEventListener('click', rollCandidate);
  $('#hireNameInput').addEventListener('input', (e) => { e.target.dataset.typed = '1'; $('#hireErr').textContent = ''; });
  $('#confirmHire').addEventListener('click', () => {
    if (!candidate) return;
    const name = $('#hireNameInput').value.trim();
    const err = nameError(name);
    if (err) { $('#hireErr').textContent = err; $('#hireNameInput').focus(); return; }
    const a = hireAgent(D.key, name, candidate.role, candidate.look);
    if (!a) return;
    toast(`🎊 ${a.name}が${DEPTS[D.key].name}に加わりました！`);
    closeModals(); save(); renderCmdExamples();
  });

  $('#cmdForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#cmdInput').value;
    if (!v.trim()) return;
    runCommand(v);
    $('#cmdInput').value = '';
    renderCmdExamples();
  });
  $('#cmdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#cmdForm').requestSubmit(); }
  });
  $('#cmdExamples').addEventListener('click', (e) => {
    const b = e.target.closest('.ex');
    if (b) { $('#cmdInput').value = b.textContent; $('#cmdInput').focus(); }
  });
  renderCmdExamples();

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
    timers.length = 0;
    closeModals();
    newGame(); buildRoom(); cmdLog.length = 0; renderCmdLog(); renderCmdExamples();
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
    // 速度を上げてもキャラが壁抜けしないよう細かく刻む。見ていない部署も裏で進める
    const total = real * speed, n = Math.ceil(total / 0.05);
    for (let i = 0; i < n; i++) {
      state.time += total / n;
      DEPT_KEYS.forEach((k) => { D = state.depts[k]; step(total / n); });
    }
    D = state.depts[state.view];
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
