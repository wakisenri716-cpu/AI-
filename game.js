'use strict';
/* =========================================================
 *  AIエージェント オフィス
 *  アイソメトリックなホールで、AIエージェントが
 *  営業部・事務部のパチンコホールで、台を打つ（＝作業）→ 大当たりで提出するシミュレーション
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
    name: '営業部', icon: 'SALES', hall: 'SALES HALL', boxLabel: '景品カウンター', boardTitle: '本日の稼働状況', poster: ['新台入替', 'GRAND OPEN'], mvpTitle: '本日の最多大当り',
    roles: {
      inside: { label: 'インサイドセールス', task: 'アポ獲得', icon: '架電' },
      proposal: { label: '提案担当', task: '提案書', icon: '提案' },
      field: { label: 'フィールドセールス', task: '商談', icon: '商談' },
      cs: { label: 'カスタマーサクセス', task: '既存フォロー', icon: '既存' },
    },
    ideas: {
      inside: ['リスト50件にアポ電', 'Web問い合わせに返信', '展示会リードを整理', '休眠顧客に再アプローチ', 'セミナー参加者へ架電'],
      proposal: ['A社向け提案書を作成', '見積書を作成', '導入事例スライドを更新', '料金比較表を作成', 'RFPへの回答書'],
      field: ['B社と初回商談', 'C社へクロージング', '新規エリアを訪問', '決裁者プレゼン', 'オンライン商談'],
      cs: ['既存顧客の定例MTG', '解約防止ヒアリング', 'アップセル提案', '導入後アンケート', '活用セミナー開催'],
    },
    workLines: {
      inside: ['お世話になっております', 'ご担当者様はいらっしゃいますか', 'アポが取れた', '折り返し待ち', 'リストを消化中'],
      proposal: ['課題を整理する', '構成が決まった', '数字で詰める', '誤字を確認', '使える事例がある'],
      field: ['御社の課題は', '前向きに検討とのこと', '決裁者に刺さった', '値引きは厳しい', '握手'],
      cs: ['ご活用状況はいかがですか', '要望を記録', '満足度は上がっている', '次回の定例を設定', '解約の兆候はない'],
    },
    chats: [['今月あと何件ですか', 'あと三件です'], ['A社どうでした', '前向きでした'], ['アポ取れました', 'さすがですね'], ['来客の予定ありますか', '会議室を押さえておきます']],
    theme: { floorA: '#3a1218', floorB: '#34101a', floorLine: '#8a6a2e', wallL: '#2a2430', wallR: '#231e29', wainscot: '#1a1519', neon: '#ff3d5a', glow: '#ffb36b', vending: '#8f1f2b', machines: ['#7a1d26', '#8a6a2e', '#2f2d36'], accent: '#c4373f' },
  },
  admin: {
    name: '事務部', icon: 'ADMIN', hall: 'ADMIN HALL', boxLabel: '景品カウンター', boardTitle: '本日の稼働状況', poster: ['全台設定', 'EVENT DAY'], mvpTitle: '本日の最多大当り',
    roles: {
      account: { label: '経理', task: '経理', icon: '経理' },
      general: { label: '総務', task: '総務', icon: '総務' },
      hr: { label: '人事', task: '人事', icon: '人事' },
      legal: { label: '法務', task: '法務', icon: '法務' },
    },
    ideas: {
      account: ['請求書を発行', '経費精算をチェック', '月次の仕訳を入力', '入金消込', '支払い予定表を更新'],
      general: ['備品を発注', '会議室の予約を整理', '社内イベントの準備', '名刺を手配', '防災用品を点検'],
      hr: ['勤怠を締める', '入社手続き', '給与計算を確認', '求人票を更新', '年末調整の案内'],
      legal: ['契約書をチェック', 'NDAを締結', '就業規則を改訂', '利用規約の見直し', '押印申請を処理'],
    },
    workLines: {
      account: ['電卓を叩く', '一円合わない', '仕訳完了', '領収書が足りない', '締め日まであと少し'],
      general: ['在庫を確認', '発注した', '会議室が重複している', 'ラベルを貼る', '備品は足りている'],
      hr: ['勤怠を確認', '書類はそろった', '入社日が決まった', '有給残数を確認', '受け入れ準備'],
      legal: ['この条項は', '修正を入れる', 'リスクはない', '押印を依頼', '法改正を確認'],
    },
    chats: [['今日締め日でしたっけ', '明日です'], ['コピー機がまた詰まって', '見ておきます'], ['新人はいつからですか', '来週月曜です'], ['印鑑ありますか', 'どうぞ']],
    theme: { floorA: '#111a2e', floorB: '#0f1729', floorLine: '#3d6a8a', wallL: '#222833', wallR: '#1c222c', wainscot: '#13171e', neon: '#3fc8ff', glow: '#9fd2ff', vending: '#1f4c8f', machines: ['#1f3f6e', '#3b3f4a', '#245a5a'], accent: '#3a7bd5' },
  },
};
const DEPT_KEYS = Object.keys(DEPTS);

const DIFF = {
  easy:   { label: '★',   work: 22 },
  normal: { label: '★★',  work: 42 },
  hard:   { label: '★★★', work: 70 },
};
const IDLE_LINES = ['……', '次の案件は', '一服するか', '台の調子はどうだ', '少し様子を見る'];
const CHATS = [
  ['お疲れさまです', 'お疲れさまです'], ['今日は出てますか', 'まあまあです'], ['コーヒー飲みました？', '三杯目です'],
  ['あの台どうでした', 'ハマりました'], ['昼どうします', 'そばにします'], ['新台入ったらしいですね', '後で見てきます'],
];
const NAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '清水', '山口', '斎藤', '森', '池田', '橋本', '石川'];

const SKINS = ['#f1d3bd', '#e6c0a3', '#d4a584', '#b07d5a', '#7d5238'];
const HAIRS = ['#16130f', '#2e2119', '#4a3324', '#6b4a32', '#8a6a4a', '#a39a8f', '#c9b48a', '#5a2a20', '#dcd9d2'];
const OUTFITS = ['#2b2f3a', '#1f2a44', '#3a3a3d', '#5b5e66', '#6b5a45', '#2f3b30', '#4a2228', '#c9c2b4', '#121216'];
const ACCENTS = ['#7a1f2b', '#1f2f5a', '#8a6d2c', '#3d4a3a', '#555a66', '#ffffff'];
const STYLES = { short: 'ショート', long: 'ロング', bob: 'ボブ', twin: 'ポニーテール', spiky: '短髪', bun: 'まとめ髪' };
const ACCS = { none: 'なし', glasses: 'メガネ', headphones: 'ヘッドセット', antenna: 'キャップ', ribbon: 'マスク', neko: 'ひげ' };

/* ---------- 部屋レイアウト（両部署で共通の間取り） ---------- */
// パチンコ台（エージェントの持ち台）。座る位置は台の手前（y+1）
const DESKS = [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6]];
const COFFEE_SPOTS = [[8, 1], [7, 1], [9, 1]];
const OUTBOX_SPOTS = [[1, 4], [1, 3], [1, 5]];
const SOFA_SPOTS = [[1, 7], [1, 8]];

// パチンコホール：景品棚・両替機・自販機・花輪・景品カウンター・休憩ソファ、台が2列（手前の列が持ち台）
const FURNITURE = [
  { kind: 'prize', x: 2, y: 0 }, { kind: 'prize', x: 3, y: 0 },
  { kind: 'feature', x: 5, y: 0 },
  { kind: 'coffee', x: 8, y: 0 },
  { kind: 'hanawa', x: 9, y: 0 }, { kind: 'plant', x: 0, y: 9 }, { kind: 'plant', x: 9, y: 9 },
  { kind: 'outbox', x: 0, y: 4 },
  { kind: 'sofa', x: 0, y: 7, w: 1, d: 2 },
  ...DESKS.map(([x, y], i) => ({ kind: 'machine', x, y, desk: i })),
  ...[3, 4, 5, 6, 7, 8].map((x) => ({ kind: 'machine', x, y: 3 })),
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
 *  キャラクター SVG
 * ========================================================= */
function charSVG(lk) {
  // 頭身を上げた大人のキャラクター（スーツ姿）。viewBox 44x100、足元が y=97
  const { skin, hair, outfit, accent } = lk;
  const skinD = shade(skin, -0.14);
  const hairD = shade(hair, -0.32), hairL = shade(hair, 0.22);
  const jacketD = shade(outfit, -0.3), jacketL = shade(outfit, 0.14);
  const pants = shade(outfit, -0.38), pantsD = shade(outfit, -0.52);
  const noTie = accent === '#ffffff';

  const backHair = {
    long: `<path d="M13.4,13 C11.6,28 12,40 13.8,47 L30.2,47 C32,40 32.4,28 30.6,13 Z" fill="${hairD}"/>`,
    bob: `<path d="M13.6,13 C12.6,22 13,28 14.6,30.5 L29.4,30.5 C31,28 31.4,22 30.4,13 Z" fill="${hairD}"/>`,
    twin: `<path d="M27.6,12.5 C35.5,13.5 35.8,27 33,38.5 C31.4,33 30,24 26.4,18 Z" fill="${hairD}"/>`,
    bun: `<ellipse cx="22" cy="6.2" rx="4.4" ry="3.4" fill="${hairD}"/>`,
  }[lk.style] || '';

  const frontHair = {
    long: `<path d="M14,17 C13,8.4 17,5.8 22,5.8 C27.4,5.8 31,8.4 30,17 C29.4,13.2 28.2,11.4 26.2,10.8 C23,12.4 18.6,12 16.2,11.4 C15,12.8 14.4,14.6 14,17 Z" fill="${hair}"/>
           <path d="M14,13 C12.8,22 13.2,30 14.4,36 L16.2,36 C15.4,28 15.2,20 16.2,13 Z M30,13 C31.2,22 30.8,30 29.6,36 L27.8,36 C28.6,28 28.8,20 27.8,13 Z" fill="${hair}"/>`,
    bob: `<path d="M13.4,22 C12.4,8.8 17,5.8 22,5.8 C27,5.8 31.6,8.8 30.6,22 L28.6,22 C28.8,16 28,12.6 26,11.6 C22,12.6 18,12.3 16.2,11.8 C15.4,14 15.2,18 15.4,22 Z" fill="${hair}"/>`,
    twin: `<path d="M14,16.6 C13.4,8.4 17,5.8 22,5.8 C27.3,5.8 30.8,8.4 30.2,15 C28.4,11.4 25,10.4 21,10.6 C18,10.8 15.6,12.6 14,16.6 Z" fill="${hair}"/>`,
    spiky: `<path d="M14.3,15 C14,8.4 17.6,6.4 22,6.4 C26.6,6.4 30,8.4 29.7,15 C29,11.4 27.4,9.8 22,9.8 C16.6,9.8 15,11.4 14.3,15 Z" fill="${hair}"/>`,
    bun: `<path d="M14,16.4 C13.4,8.6 17,6 22,6 C27,6 30.6,8.6 30,16.4 C28.8,12 26,10.6 22,10.6 C18,10.6 15.2,12 14,16.4 Z" fill="${hair}"/>`,
  }[lk.style] || `<path d="M14,17 C13,8.4 17,5.8 22,5.8 C27.4,5.8 31,8.4 30,17 C29.4,13.4 28.4,11.4 26.4,10.8 C23,12.4 18.6,12.1 16,11.4 C15,12.8 14.4,14.6 14,17 Z" fill="${hair}"/>`;

  // 後ろ姿の頭（髪で覆う）
  const backHead = lk.style === 'long'
    ? `<path d="M14,16 C14,8 17.8,5.8 22,5.8 C26.2,5.8 30,8 30,16 C30.6,26 31,36 29.8,46 L14.2,46 C13,36 13.4,26 14,16 Z" fill="${hair}"/>`
    : lk.style === 'bob'
      ? `<path d="M13.6,16 C13.6,8 17.8,5.8 22,5.8 C26.2,5.8 30.4,8 30.4,16 C30.8,22 30.6,27 29.4,30.5 L14.6,30.5 C13.4,27 13.2,22 13.6,16 Z" fill="${hair}"/>`
      : `<path d="M14.2,16 C14.2,8 17.8,5.8 22,5.8 C26.2,5.8 29.8,8 29.8,16 C29.8,21 28.2,24.6 22,24.8 C15.8,24.6 14.2,21 14.2,16 Z" fill="${hair}"/>`;

  const acc = {
    glasses: `<g class="face" fill="none" stroke="#1e1d22" stroke-width=".55"><rect x="16.7" y="15.9" width="4.4" height="3.1" rx=".9"/><rect x="22.9" y="15.9" width="4.4" height="3.1" rx=".9"/><path d="M21.1,17.1 L22.9,17.1"/></g>`,
    headphones: `<path d="M14,15.5 C14,4.6 30,4.6 30,15.5" fill="none" stroke="#242328" stroke-width="1.4"/><rect x="12.4" y="14.4" width="3.2" height="5.6" rx="1.1" fill="#242328"/><rect x="28.4" y="14.4" width="3.2" height="5.6" rx="1.1" fill="#242328"/><path class="face" d="M14.2,19.6 C14.8,23.4 17.2,24.2 19.4,23.8" fill="none" stroke="#242328" stroke-width=".7"/>`,
    antenna: `<path d="M13.6,13.2 C13.6,5.6 30.4,5.6 30.4,13.2 Z" fill="${noTie ? '#2b2d33' : accent}"/><path class="face" d="M14.6,13 L31.8,13.2 C31.4,14.6 28.6,15 26.4,14.6 L14.6,14.2 Z" fill="${shade(noTie ? '#2b2d33' : accent, -0.35)}"/>`,
    ribbon: `<path class="face" d="M15.6,19.4 C18,18.8 26,18.8 28.4,19.4 C28.2,23.4 26,25.6 22,25.6 C18,25.6 15.8,23.4 15.6,19.4 Z" fill="#e4e6ea"/><path class="face" d="M16.6,21 L27.4,21 M17,22.8 L27,22.8" stroke="#c9ccd2" stroke-width=".4"/>`,
    neko: `<path class="face" d="M15.4,20 C16,24.8 18.8,26 22,26 C25.2,26 28,24.8 28.6,20 C27.6,22.6 25.6,23.6 22,23.6 C18.4,23.6 16.4,22.6 15.4,20 Z" fill="${hairD}" opacity=".55"/>`,
  }[lk.acc] || '';

  return `<svg viewBox="0 0 44 100" xmlns="http://www.w3.org/2000/svg">
  <g class="bob">
    ${backHair}
    <g class="legs">
      <g class="leg l"><path d="M12.6,56 L21.6,56 L20.8,92.6 L15.4,92.6 Z" fill="${pants}"/><path d="M14.4,92 L21,92 L21.2,96.8 L12.4,96.8 C12.4,94.6 13.2,92.8 14.4,92 Z" fill="#141317"/></g>
      <g class="leg r"><path d="M22.4,56 L31.4,56 L28.6,92.6 L23.2,92.6 Z" fill="${pantsD}"/><path d="M23,92 L29.6,92 C30.8,92.8 31.6,94.6 31.6,96.8 L22.8,96.8 Z" fill="#0f0e12"/></g>
    </g>
    <rect x="19.6" y="23" width="4.8" height="6" fill="${skinD}"/>
    <path d="M10,33 C10,29.6 14,28.4 18,28 L26,28 C30,28.4 34,29.6 34,33 L32.6,58 L11.4,58 Z" fill="${outfit}"/>
    <path d="M27.6,28.8 C31.2,29.6 34,30.8 34,33 L32.6,58 L28.6,58 Z" fill="${jacketD}" opacity=".55"/>
    <path d="M11,34 C11.4,31 13.4,29.8 16,29.2 L15,36 Z" fill="${jacketL}" opacity=".35"/>
    <g class="front-only">
      <path d="M18.4,28.1 L22,39 L25.6,28.1 Z" fill="#eceae6"/>
      ${noTie ? '<path d="M20.2,28.4 L22,32 L23.8,28.4 Z" fill="#d4d1cb"/>'
        : `<path d="M21,29.6 L23,29.6 L23.5,31.2 L22.6,41 L22,42 L21.4,41 L20.5,31.2 Z" fill="${accent}"/><path d="M21,29.6 L23,29.6 L22.7,31 L21.3,31 Z" fill="${shade(accent, -0.3)}"/>`}
      <path d="M18.4,28.1 L22,39 L19.2,34 L16.4,29 Z" fill="${jacketD}"/>
      <path d="M25.6,28.1 L22,39 L24.8,34 L27.6,29 Z" fill="${jacketD}"/>
      <circle cx="22" cy="46" r=".65" fill="${jacketD}"/><circle cx="22" cy="51" r=".65" fill="${jacketD}"/>
    </g>
    <path d="M11.4,57 L32.6,57" stroke="${jacketD}" stroke-width=".6"/>
    <g class="arm l"><path d="M10,33 C8.6,40 8.4,49 9.2,56 L12.6,56 C12.6,49 13,41 13.8,35 Z" fill="${outfit}"/><path d="M9.2,55 L12.6,55 L12.6,56.4 L9.2,56.4 Z" fill="#eceae6"/><ellipse cx="10.9" cy="58.4" rx="1.9" ry="2.5" fill="${skin}"/></g>
    <g class="arm r"><path d="M34,33 C35.4,40 35.6,49 34.8,56 L31.4,56 C31.4,49 31,41 30.2,35 Z" fill="${jacketD}"/><path d="M31.4,55 L34.8,55 L34.8,56.4 L31.4,56.4 Z" fill="#d4d1cb"/><ellipse cx="33.1" cy="58.4" rx="1.9" ry="2.5" fill="${skinD}"/></g>
    <ellipse cx="14.5" cy="18" rx="1.3" ry="2" fill="${skinD}"/><ellipse cx="29.5" cy="18" rx="1.3" ry="2" fill="${skinD}"/>
    <path d="M14.4,16 C14.4,9.4 17.8,7.4 22,7.4 C26.2,7.4 29.6,9.4 29.6,16 C29.6,21 27.4,25.6 22,25.6 C16.6,25.6 14.4,21 14.4,16 Z" fill="${skin}"/>
    <path d="M27,10 C29,12 29.6,14 29.6,16 C29.6,21 27.4,25.6 22,25.6 C25.4,24 27.2,20.6 27,10 Z" fill="${skinD}" opacity=".45"/>
    <g class="face">
      <path d="M16.9,14.5 L20.4,14 M23.6,14 L27.1,14.5" stroke="${hairD}" stroke-width=".9" stroke-linecap="round"/>
      <g class="eyes"><ellipse cx="18.9" cy="17.4" rx="1" ry="1.2" fill="#18161b"/><ellipse cx="25.1" cy="17.4" rx="1" ry="1.2" fill="#18161b"/></g>
      <path d="M22.2,18.4 L21.4,21.4 L22.6,21.6" stroke="${skinD}" stroke-width=".6" fill="none" stroke-linecap="round"/>
      <path d="M20.3,23.3 L23.7,23.2" stroke="#7d5146" stroke-width=".7" stroke-linecap="round"/>
    </g>
    <g class="fronthair">${frontHair}<path d="M17,9 C19,8 22,7.8 25,8.4" stroke="${hairL}" stroke-width=".6" fill="none" opacity=".6"/></g>
    <g class="backhead">${backHead}<path d="M22,8 L22,20" stroke="${hairD}" stroke-width=".5" opacity=".5"/></g>
    ${acc}
  </g>
</svg>`;
}

/* =========================================================
 *  家具 SVG
 * ========================================================= */
// 床に落ちる影（家具の足元）
const floorShadow = (x, y, w, d, o = 0.38) => poly([[x + 0.08, y + 0.1, 0], [x + w + 0.12, y + 0.1, 0], [x + w + 0.12, y + d + 0.16, 0], [x + 0.08, y + d + 0.16, 0]], `rgba(0,0,0,${o})`);
// 前面（y 一定の面）に描くためのスキュー座標系。u は右へ、v は上へ負
const faceY = (x, y, inner) => { const [ox, oy] = L(x, y, 0); return `<g transform="matrix(1,0.5,0,1,${ox.toFixed(1)},${oy.toFixed(1)})">${inner}</g>`; };

function machineFace(th) {
  // 盤面の釘：命釘まわりと風車を意識して円周上に配置
  const nails = [];
  for (let ring = 0; ring < 3; ring++) {
    const r = 11.2 - ring * 2.6, n = 16 - ring * 4;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.95 + (i / (n - 1)) * 1.1);
      nails.push(`<circle cx="${(13.4 + Math.cos(a) * r).toFixed(2)}" cy="${(-77 + Math.sin(a) * r * 1.05).toFixed(2)}" r=".32"/>`);
    }
  }
  const balls = [5.5, 8, 10.5, 13, 15.5].map((u, i) => `<circle cx="${u}" cy="${-56.2 - (i % 2) * 0.6}" r="1.15" fill="url(#gBall)"/>`).join('');
  return `
    <rect x="0" y="-102" width="26.9" height="78" fill="url(#gCab)"/>
    <rect x="0" y="-102" width="26.9" height="78" fill="currentColor" opacity=".18"/>
    <rect class="lamp" x="1.2" y="-101" width="24.5" height="4.2" rx="2" fill="currentColor" filter="url(#fGlow)"/>
    <rect x="1.6" y="-95.6" width="23.7" height="34" rx="2.6" fill="#0d0c10"/>
    <rect x="2.4" y="-94.8" width="22.1" height="32.4" rx="2.2" fill="url(#gBoard)"/>
    <circle cx="13.4" cy="-77" r="12.6" fill="none" stroke="url(#gChrome)" stroke-width="1.1"/>
    <g fill="#d8b866">${nails.join('')}</g>
    <path d="M5,-71 C7,-66 10,-64.4 13.4,-64.4 C16.8,-64.4 19.8,-66 21.8,-71" fill="none" stroke="#b8963e" stroke-width=".7"/>
    <rect class="scr" x="7.2" y="-86.6" width="12.4" height="10.4" rx="1" fill="url(#gLcd)" stroke="#2a2830" stroke-width=".5"/>
    <text class="reel" x="13.4" y="-79.6" font-size="5.6" font-weight="700" text-anchor="middle" fill="#f3f1ec" font-family="Oswald, sans-serif">7 3 5</text>
    <text class="fever-t" x="13.4" y="-79.6" font-size="5.6" font-weight="700" text-anchor="middle" fill="#ffd34d" font-family="Oswald, sans-serif">7 7 7</text>
    <path d="M6.4,-87.6 C9,-90.6 17.8,-90.6 20.4,-87.6" fill="none" stroke="#c9a54a" stroke-width=".9"/>
    <rect x="11.6" y="-69.4" width="3.6" height="2.4" rx=".6" fill="#2b2a31" stroke="#c9a54a" stroke-width=".4"/>
    <rect x="1.4" y="-60.4" width="24.1" height="8.8" rx="2.2" fill="url(#gChrome)"/>
    <rect x="3" y="-58.6" width="15.4" height="4.4" rx="1.6" fill="#1c1b20"/>
    ${balls}
    <rect x="2.6" y="-49.6" width="16" height="6" rx="1.6" fill="#1c1b20" stroke="url(#gChrome)" stroke-width=".6"/>
    <circle cx="22.6" cy="-47.2" r="2.9" fill="url(#gChrome)" stroke="#45434c" stroke-width=".4"/>
    <circle cx="22.6" cy="-47.2" r="1.1" fill="#2b2a31"/>
    <rect x="20.6" y="-56" width="4" height="2.2" rx="1.1" fill="${th.accent}" opacity=".9"/>
  `;
}

function furnitureSVG(f, key) {
  const th = DEPTS[key].theme;
  switch (f.kind) {
    case 'machine': {
      const body = th.machines[(f.x + f.y) % th.machines.length];
      let s = floorShadow(0, 0.1, 1, 0.8);
      s += box(0.02, 0.12, 0.96, 0.76, 24, 0, '#25222b');
      s += box(0.0, 0.1, 1.0, 0.8, 2, 24, '#8d8a93');
      s += box(0.08, 0.22, 0.84, 0.58, 78, 26, body);
      // データカウンター
      s += box(0.2, 0.42, 0.6, 0.26, 12, 104, '#141317');
      s += faceY(0.2, 0.68, `<rect x="1.4" y="-114" width="16.4" height="8" rx="1" fill="#070608"/><text x="9.6" y="-107.6" font-size="6" font-weight="700" text-anchor="middle" fill="#ff3d3d" font-family="Oswald, sans-serif" filter="url(#fGlow)">${String((f.x * 7 + f.y * 13) % 40).padStart(2, '0')}</text>`);
      s += faceY(0.08, 0.8, machineFace(th));
      // 台間の玉貸し機（サンド）
      s += box(0.9, 0.3, 0.1, 0.5, 64, 26, '#2c2a31');
      // イス
      const [cx, cy] = L(0.5, 1.32, 0);
      s += `<ellipse cx="${cx}" cy="${cy}" rx="7" ry="3.2" fill="#121115"/>`;
      s += `<rect x="${cx - 1.5}" y="${cy - 17}" width="3" height="17" fill="url(#gChrome)"/>`;
      s += `<ellipse cx="${cx}" cy="${cy - 17.4}" rx="8.6" ry="4.2" fill="#121014"/>`;
      s += `<ellipse cx="${cx}" cy="${cy - 19.2}" rx="8.6" ry="4.2" fill="#2a2329"/>`;
      s += `<ellipse cx="${cx - 2}" cy="${cy - 20.2}" rx="4" ry="1.4" fill="#ffffff" opacity=".08"/>`;
      return s;
    }
    case 'prize': {
      let s = floorShadow(0.04, 0.02, 0.92, 0.5);
      s += box(0.04, 0.02, 0.92, 0.5, 86, 0, '#1d1b22');
      const items = [];
      const cols = ['#9b2c2c', '#2c4f86', '#b8862f', '#2f6a4a', '#d6d3cc', '#4a4650', '#7a3b62'];
      [8, 34, 58].forEach((z, r) => {
        let u = 2.4;
        for (let i = 0; u < 27; i++) {
          const w = 3.2 + ((i + r) % 3) * 1.6, h = 9 + ((i * 5 + r * 3) % 7);
          items.push(`<rect x="${u}" y="${-z - h}" width="${w}" height="${h}" fill="${cols[(i * 3 + r) % cols.length]}"/><rect x="${u + 0.6}" y="${-z - h + 2}" width="${w - 1.2}" height="1" fill="#fff" opacity=".35"/>`);
          u += w + 0.8;
        }
        items.push(`<rect x="1.2" y="${-z}" width="28" height="1.2" fill="#d9d6cf" opacity=".5"/>`);
      });
      s += faceY(0.04, 0.52, `
        <rect x="1" y="-80" width="28.4" height="76" fill="#f4efe2" opacity=".06"/>
        ${items.join('')}
        <rect x="1" y="-80" width="28.4" height="76" fill="url(#gGlass)" opacity=".25"/>
        <rect x="1" y="-86" width="28.4" height="5" fill="#0f0e12"/>
        <text x="15.2" y="-82.2" font-size="4" font-weight="700" text-anchor="middle" fill="#e2c27a" letter-spacing=".6">PRIZE</text>`);
      return s;
    }
    case 'feature': {
      let s = floorShadow(0.15, 0.12, 0.7, 0.5);
      s += box(0.15, 0.12, 0.7, 0.5, 72, 0, '#b9bcc4');
      s += faceY(0.15, 0.62, `
        <rect x="2" y="-68" width="18.4" height="62" rx="1" fill="#a6a9b2"/>
        <rect x="3.4" y="-64" width="15.6" height="11" rx="1" fill="url(#gLcd)"/>
        <text x="11.2" y="-56.6" font-size="4" font-weight="700" text-anchor="middle" fill="#bfe8ff">両替</text>
        <g fill="#54575f">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${5 + c * 4.2}" y="${-48 + r * 3.6}" width="3" height="2.4" rx=".4"/>`).join('')).join('')}</g>
        <rect x="4.4" y="-34" width="13.6" height="2" rx="1" fill="#2a2a30"/>
        <rect x="4.4" y="-26" width="13.6" height="8" rx="1" fill="#2a2a30"/>`);
      return s;
    }
    case 'coffee': {
      let s = floorShadow(0.12, 0.1, 0.76, 0.55);
      s += box(0.12, 0.1, 0.76, 0.55, 86, 0, th.vending);
      const rows = [];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) {
        const c = ['#c23b3b', '#e8e4dc', '#2f5aa0', '#c99a2e', '#2f6a4a'][(r * 2 + i) % 5];
        rows.push(`<rect x="${2.6 + i * 3.8}" y="${-80 + r * 11}" width="2.4" height="7.4" rx=".8" fill="${c}"/><rect x="${2.9 + i * 3.8}" y="${-81.2 + r * 11}" width="1.8" height="1.4" fill="#d6d3cc"/><rect x="${2.6 + i * 3.8}" y="${-71.6 + r * 11}" width="2.4" height="1" fill="#d93" opacity=".8"/>`);
      }
      s += faceY(0.12, 0.65, `
        <rect x="1.4" y="-84" width="21.6" height="38" rx="1" fill="#e9eef2"/>
        ${rows.join('')}
        <rect x="1.4" y="-84" width="21.6" height="38" fill="url(#gGlass)" opacity=".3"/>
        <rect x="16" y="-42" width="5" height="9" rx=".6" fill="#16151a"/>
        <rect x="2.6" y="-20" width="18" height="7" rx="1" fill="#141317"/>
        <text x="8.4" y="-37" font-size="3.6" font-weight="700" fill="#fff" opacity=".85">DRINK</text>`);
      return s;
    }
    case 'plant': {
      let s = floorShadow(0.25, 0.25, 0.5, 0.5);
      s += box(0.3, 0.3, 0.4, 0.4, 18, 0, '#3b3a40');
      const [cx, cy] = L(0.5, 0.5, 18);
      const leaves = [[-10, -14, -35], [9, -16, 30], [-4, -26, -10], [5, -24, 15], [0, -32, 0], [-13, -6, -55], [12, -8, 55]];
      s += leaves.map(([dx, dy, rot], i) => `<ellipse cx="${cx + dx}" cy="${cy + dy}" rx="3.6" ry="11" transform="rotate(${rot} ${cx + dx} ${cy + dy})" fill="${['#2f5d3a', '#3c7047', '#264d30'][i % 3]}"/>`).join('');
      return s;
    }
    case 'hanawa': {
      const [cx, cy] = L(0.5, 0.5, 0);
      let s = `<path d="M${cx - 11},${cy} L${cx},${cy - 62} L${cx + 11},${cy}" stroke="#6b5a45" stroke-width="1.6" fill="none"/>`;
      const ring = ['#f2efe8', '#e6c34a', '#c9425a', '#f2efe8', '#d97f9a', '#e6c34a'];
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const x = cx + Math.cos(a) * 17, y = cy - 84 + Math.sin(a) * 17;
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${ring[i % ring.length]}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="${shade(ring[i % ring.length], -0.3)}"/>`;
      }
      s += `<circle cx="${cx}" cy="${cy - 84}" r="11" fill="#f7f4ee"/>`;
      s += `<text x="${cx}" y="${cy - 80}" font-size="10" font-weight="700" text-anchor="middle" fill="#8c1f2e">祝</text>`;
      s += `<rect x="${cx - 4.5}" y="${cy - 66}" width="9" height="34" fill="#f7f4ee"/>`;
      s += `<text x="${cx}" y="${cy - 61}" font-size="6" font-weight="700" text-anchor="middle" fill="#1d1b22" writing-mode="tb" letter-spacing="1">新装開店</text>`;
      return s;
    }
    case 'outbox': {
      let s = floorShadow(0.1, 0.03, 0.66, 0.94);
      s += box(0.12, 0.05, 0.6, 0.9, 34, 0, '#3a2a22');
      s += box(0.1, 0.03, 0.66, 0.94, 3, 34, '#d8d3c8');
      s += poly([[0.72, 0.05, 6], [0.72, 0.95, 6], [0.72, 0.95, 8], [0.72, 0.05, 8]], '#c9a54a');
      s += box(0.25, 0.25, 0.2, 0.2, 9, 37, '#9b2c2c') + box(0.28, 0.6, 0.16, 0.16, 13, 37, '#2c4f86');
      const [tx, ty] = L(0.45, 0.5, 76);
      s += `<rect x="${tx - 34}" y="${ty - 10}" width="68" height="14" rx="2" fill="#141317" stroke="#c9a54a" stroke-width="1"/>`;
      s += `<text x="${tx}" y="${ty + 0.5}" font-size="8" font-weight="700" text-anchor="middle" fill="#e2c27a" letter-spacing=".5">${DEPTS[key].boxLabel}</text>`;
      return s;
    }
    case 'sofa': {
      const c = '#2a262c';
      let s = floorShadow(0.04, 0.05, 0.9, 1.9);
      s += box(0.04, 0.05, 0.26, 1.9, 40, 0, '#1e1b21');
      s += box(0.2, 0.05, 0.7, 1.9, 14, 0, c);
      s += box(0.24, 0.22, 0.64, 0.76, 5, 14, '#36313a');
      s += box(0.24, 1.02, 0.64, 0.76, 5, 14, '#36313a');
      s += box(0.14, 0.05, 0.78, 0.18, 22, 0, '#1e1b21');
      s += box(0.14, 1.77, 0.78, 0.18, 22, 0, '#1e1b21');
      return s;
    }
  }
  return '';
}

function roomSVG(key) {
  const dp = DEPTS[key], th = dp.theme;
  let s = `<defs>
    <linearGradient id="gCab" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".18"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".35"/></linearGradient>
    <linearGradient id="gBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5f86"/><stop offset=".55" stop-color="#22385a"/><stop offset="1" stop-color="#14213a"/></linearGradient>
    <linearGradient id="gLcd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1730"/><stop offset="1" stop-color="#284a86"/></linearGradient>
    <linearGradient id="gChrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset=".35" stop-color="#9ba0a9"/><stop offset=".6" stop-color="#e3e5e8"/><stop offset="1" stop-color="#6f747d"/></linearGradient>
    <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".3" stop-color="#ffffff" stop-opacity="0"/><stop offset=".7" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".35"/></linearGradient>
    <radialGradient id="gBall" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9bdc5"/><stop offset="1" stop-color="#5f636b"/></radialGradient>
    <radialGradient id="gPool"><stop offset="0" stop-color="${th.glow}" stop-opacity=".42"/><stop offset="1" stop-color="${th.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="gWallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(th.wallL, 0.1)}"/><stop offset="1" stop-color="${shade(th.wallL, -0.25)}"/></linearGradient>
    <linearGradient id="gWallR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(th.wallR, 0.1)}"/><stop offset="1" stop-color="${shade(th.wallR, -0.25)}"/></linearGradient>
    <linearGradient id="gPoster" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.accent}"/><stop offset="1" stop-color="#0d0c10"/></linearGradient>
    <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  const W = (list, fill, extra = '') => `<polygon points="${list.map(([x, y, z]) => P(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  // 壁（上部はグラデーション、腰壁は濃い板張り）
  s += W([[0, 0, 0], [0, N, 0], [0, N, WALL], [0, 0, WALL]], 'url(#gWallL)');
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, WALL], [0, 0, WALL]], 'url(#gWallR)');
  s += W([[0, 0, 0], [0, N, 0], [0, N, 46], [0, 0, 46]], th.wainscot);
  s += W([[0, 0, 0], [N, 0, 0], [N, 0, 46], [0, 0, 46]], shade(th.wainscot, -0.12));
  for (let i = 1; i < N; i++) {
    s += `<line x1="${P(0, i, 0)[0]}" y1="${P(0, i, 0)[1]}" x2="${P(0, i, 46)[0]}" y2="${P(0, i, 46)[1]}" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>`;
    s += `<line x1="${P(i, 0, 0)[0]}" y1="${P(i, 0, 0)[1]}" x2="${P(i, 0, 46)[0]}" y2="${P(i, 0, 46)[1]}" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>`;
  }
  s += W([[0, 0, 46], [0, N, 46], [0, N, 49], [0, 0, 49]], '#8e8a84');
  s += W([[0, 0, 46], [N, 0, 46], [N, 0, 49], [0, 0, 49]], '#7a7671');
  // 天井際の間接照明
  s += W([[0, N, WALL - 8], [0, 0, WALL - 8], [0, 0, WALL - 3], [0, N, WALL - 3]], th.neon, 'class="neon" filter="url(#fGlow)"');
  s += W([[0, 0, WALL - 8], [N, 0, WALL - 8], [N, 0, WALL - 3], [0, 0, WALL - 3]], th.neon, 'class="neon" filter="url(#fGlow)"');
  s += W([[0, N, WALL], [0, 0, WALL], [-0.25, -0.25, WALL], [-0.25, N, WALL]], '#3a3740');
  s += W([[0, 0, WALL], [N, 0, WALL], [N, -0.25, WALL], [-0.25, -0.25, WALL]], '#2f2c35');

  // 床：ホール用カーペット（菱形の地紋）
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
    s += W([[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]], (x + y) % 2 ? th.floorB : th.floorA);
    s += W([[x, y + 0.5, 0], [x + 1, y + 0.5, 0]], 'none', `stroke="${th.floorLine}" stroke-width=".5" opacity=".25"`);
    s += W([[x + 0.5, y, 0], [x + 0.5, y + 1, 0]], 'none', `stroke="${th.floorLine}" stroke-width=".5" opacity=".25"`);
    s += W([[x + 0.5, y + 0.38, 0], [x + 0.62, y + 0.5, 0], [x + 0.5, y + 0.62, 0], [x + 0.38, y + 0.5, 0]], th.floorLine, 'opacity=".4"');
  }
  // 台の前に落ちる照明
  FURNITURE.filter((f) => f.kind === 'machine').forEach((f) => {
    const [px, py] = P(f.x + 0.5, f.y + 1.15);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="34" ry="15" fill="url(#gPool)"/>`;
  });
  // 壁と床の境目の影
  s += W([[0, 0, 0], [N, 0, 0], [N, 0.35, 0], [0.35, 0.35, 0]], 'rgba(0,0,0,.25)');
  s += W([[0, 0, 0], [0.35, 0.35, 0], [0.35, N, 0], [0, N, 0]], 'rgba(0,0,0,.25)');

  // 右の壁（y=0 平面）: ネオン看板・時計・本日の最多大当り
  const [rx, ry] = P(0, 0, 0);
  s += `<g transform="matrix(1,0.5,0,1,${rx},${ry})">
    <rect x="44" y="-146" width="110" height="58" rx="3" fill="#0b0a0e" stroke="#2c2a31" stroke-width="2"/>
    <text class="neon" x="99" y="-116" font-size="21" font-weight="900" text-anchor="middle" fill="${th.neon}" filter="url(#fGlow)" letter-spacing="2">パチンコ</text>
    <text x="99" y="-99" font-size="8" font-weight="700" text-anchor="middle" fill="#cfcac0" letter-spacing="3">${dp.hall}</text>
    <circle cx="218" cy="-112" r="14" fill="#f1eee8" stroke="#1d1b22" stroke-width="2.4"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${(218 + Math.sin(a) * 11).toFixed(1)}" y1="${(-112 - Math.cos(a) * 11).toFixed(1)}" x2="${(218 + Math.sin(a) * 12.6).toFixed(1)}" y2="${(-112 - Math.cos(a) * 12.6).toFixed(1)}" stroke="#1d1b22" stroke-width="${i % 3 ? 0.6 : 1.2}"/>`; }).join('')}
    <line id="hourHand" x1="218" y1="-112" x2="218" y2="-120" stroke="#1d1b22" stroke-width="2" stroke-linecap="round"/>
    <line id="minHand" x1="218" y1="-112" x2="218" y2="-124" stroke="#1d1b22" stroke-width="1.2" stroke-linecap="round"/>
    <rect x="252" y="-136" width="62" height="54" fill="#141317" stroke="#c9a54a" stroke-width="1.6"/>
    <text x="283" y="-124" font-size="6.4" font-weight="700" text-anchor="middle" fill="#c9a54a" letter-spacing=".8">${dp.mvpTitle}</text>
    <line x1="260" y1="-119" x2="306" y2="-119" stroke="#c9a54a" stroke-width=".5" opacity=".6"/>
    <text id="mvpName" x="283" y="-101" font-size="11" font-weight="700" text-anchor="middle" fill="#f1eee8">-</text>
    <text id="mvpCount" x="283" y="-89" font-size="6" text-anchor="middle" fill="#9a95a3"></text>
  </g>`;

  // 左の壁（x=0 平面）: 新台ポスターと出玉ボード
  const [lx, ly] = P(0, N, 0);
  s += `<g transform="matrix(1,-0.5,0,1,${lx},${ly})">
    <rect x="46" y="-134" width="62" height="78" fill="url(#gPoster)" stroke="#0b0a0e" stroke-width="2"/>
    <text x="77" y="-116" font-size="13" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="1">${dp.poster[0]}</text>
    <text x="77" y="-104" font-size="6" font-weight="700" text-anchor="middle" fill="#ffffff" opacity=".8" letter-spacing="1.5">${dp.poster[1]}</text>
    <circle cx="77" cy="-80" r="13" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1"/>
    <text x="77" y="-76" font-size="12" font-weight="900" text-anchor="middle" fill="#ffd34d" font-family="Oswald, sans-serif">777</text>
    <rect x="186" y="-140" width="118" height="74" rx="2" fill="#0b0a0e" stroke="#3a3740" stroke-width="2"/>
    <text x="245" y="-125" font-size="9" font-weight="700" text-anchor="middle" fill="#e2c27a" letter-spacing="1.5">${dp.boardTitle}</text>
    <line x1="194" y1="-119" x2="296" y2="-119" stroke="#3a3740" stroke-width=".8"/>
    <text id="wbQueue" x="196" y="-104" font-size="10" fill="#ff9b42" font-family="Oswald, sans-serif" filter="url(#fGlow)">待ち 0</text>
    <text id="wbDoing" x="196" y="-89" font-size="10" fill="#ff9b42" font-family="Oswald, sans-serif" filter="url(#fGlow)">稼働 0</text>
    <text id="wbDone" x="196" y="-74" font-size="10" fill="#ff9b42" font-family="Oswald, sans-serif" filter="url(#fGlow)">大当り 0</text>
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
    x: dx + 0.5, y: dy + 1.5, tile: [dx, dy + 1],
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
      ['佐藤', 'inside', { skin: '#e6c0a3', hair: '#16130f', outfit: '#1f2a44', accent: '#7a1f2b', style: 'short', acc: 'headphones' }],
      ['高橋', 'proposal', { skin: '#f1d3bd', hair: '#4a3324', outfit: '#3a3a3d', accent: '#ffffff', style: 'bob', acc: 'none' }],
      ['田中', 'field', { skin: '#d4a584', hair: '#2e2119', outfit: '#121216', accent: '#8a6d2c', style: 'spiky', acc: 'neko' }],
      ['渡辺', 'cs', { skin: '#e6c0a3', hair: '#6b4a32', outfit: '#5b5e66', accent: '#1f2f5a', style: 'twin', acc: 'none' }],
    ],
    admin: [
      ['伊藤', 'account', { skin: '#f1d3bd', hair: '#16130f', outfit: '#2b2f3a', accent: '#ffffff', style: 'long', acc: 'glasses' }],
      ['中村', 'general', { skin: '#e6c0a3', hair: '#a39a8f', outfit: '#6b5a45', accent: '#3d4a3a', style: 'short', acc: 'none' }],
      ['小林', 'hr', { skin: '#d4a584', hair: '#2e2119', outfit: '#2f3b30', accent: '#555a66', style: 'bun', acc: 'none' }],
      ['加藤', 'legal', { skin: '#f1d3bd', hair: '#4a3324', outfit: '#121216', accent: '#1f2f5a', style: 'spiky', acc: 'glasses' }],
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

const SAVE_KEY = 'ai-agent-office-v3';
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
        if (a.sitting === 'desk') { const [dx, dy] = DESKS[a.desk]; a.tile = [dx, dy + 1]; }
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
const deptToast = (text) => toast(viewing() ? text : `［${DEPTS[D.key].name}］${text}`);

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
  goTo(a, [dx, dy + 1], () => {
    // 台に向かって座る（後ろ姿）
    a.sitting = 'desk'; a.state = 'work'; a.flip = false; a.back = true;
    const t = taskById(a.taskId);
    if (t) say(a, t.progress > 0 ? '続きを打つ' : pick(['打つか', 'この台にする', '玉を借りる']));
  }, [dx + 0.5, dy + 1.22]);
}

function goCoffee(a) {
  const spot = COFFEE_SPOTS.find((s) => !occupied(a, s)) || COFFEE_SPOTS[0];
  a.state = 'coffee';
  goTo(a, spot, () => {
    a.flip = false;
    say(a, '一服');
    a.wait = 3.5; a.waitKind = 'coffee';
    a.after = () => { a.energy = clamp(a.energy + 65, 0, 100); say(a, pick(['戻るか', '少し回復した', 'よし'])); a.state = 'idle'; a.idleT = 0.3; };
  });
}

function goSofa(a) {
  const spot = SOFA_SPOTS.find((s) => !occupied(a, s));
  if (!spot) return wander(a);
  a.state = 'sofa';
  goTo(a, spot, () => {
    a.sitting = 'sofa'; a.flip = false;
    say(a, pick(['少し休む', '目を閉じる', '腰が痛い']));
    a.wait = rand(5, 9); a.waitKind = 'sofa';
    a.after = () => { a.state = 'idle'; a.idleT = 0.5; };
  }, [spot[0] - 0.42, spot[1] + 0.5]);
}

function wander(a) {
  for (let i = 0; i < 12; i++) {
    const t = [Math.floor(rand(0, N)), Math.floor(rand(0, N))];
    if (walkable(t[0], t[1]) && !occupied(a, t) && !DESKS.some(([x, y]) => x === t[0] && y + 1 === t[1])) {
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
    say(a, `「${t.title}」、承知しました`);
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
  if (!a.bubble && Math.random() < dt * 0.1) say(a, Math.random() < 0.55 ? pick(PACHI_LINES) : pick(DEPTS[D.key].workLines[t.type]));
  if (t.progress >= t.work) return deliver(a, t);
  if (a.energy < 10) { say(a, '少し休憩する'); goCoffee(a); }
}

const PACHI_LINES = ['リーチ', '保留4つ', 'これは熱い', 'よく回る台だ', 'チャンス目', '……', '玉が減ってきた', '金保留', '赤保留', 'ボタンが来た'];

function deliver(a, t) {
  // 作業完了＝大当たり。台が光ったあと、ドル箱を景品カウンターへ運ぶ
  a.state = 'deliver';
  a.feverUntil = state.time + 4;
  say(a, pick(['大当たり', '確変突入', '777揃い']));
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
  floatText(1, 4, '+1');
  deptToast(`${a.name}が「${t.title}」で大当たり（完了）`);
  const need = a.level * 100;
  if (a.xp >= need) {
    a.xp -= need; a.level++;
    later(0.6, () => { say(a, `レベル${a.level}に上がった`, 3); floatText(a.x, a.y, 'LEVEL UP'); });
    deptToast(`${a.name}が Lv${a.level} に昇格`);
  } else {
    say(a, pick(['交換してきた', '次の台に行く', '今日はついている']));
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
  return `【${R.task}】${t.title}\n担当：${a.name}（Lv${a.level} ${roles()[a.role].label}）\n\n${bodies[t.type].join('\n\n')}`;
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
    say(a, kind === 'sofa' ? '少し休みます' : '一服してきます');
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
  if (viewing()) toast(`新しい依頼：「${t.title}」`);
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
const machineEls = [];
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
    if (f.kind === 'machine') {
      if (f.desk !== undefined) { d.dataset.desk = f.desk; machineEls[f.desk] = d; } else d.style.color = DEPTS[D.key].theme.neon;
    }
    layer.appendChild(d);
  });
  document.documentElement.style.setProperty('--dept', DEPTS[D.key].theme.accent);
  dirty = true;
}

function syncDeskColors() {
  document.querySelectorAll('.furn[data-desk]').forEach((d) => {
    const owner = D.agents.find((a) => a.desk === +d.dataset.desk);
    d.style.color = owner ? owner.look.accent === '#ffffff' ? owner.look.outfit : owner.look.accent : DEPTS[D.key].theme.neon;
  });
}

function agentEl(a) {
  let el = els.get(a.id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'agent';
    el.innerHTML = '<div class="shadow"></div><div class="figure"></div><div class="carry"><svg viewBox="0 0 24 16"><rect x="1" y="5" width="22" height="10" rx="1.5" fill="#3a3348"/><circle cx="5" cy="5" r="2.6" fill="#d9dde6"/><circle cx="10" cy="4" r="2.6" fill="#eef0f5"/><circle cx="15" cy="5" r="2.6" fill="#d9dde6"/><circle cx="19.5" cy="4.5" r="2.6" fill="#eef0f5"/><circle cx="7.5" cy="1.8" r="2.4" fill="#f5f6fa"/><circle cx="13" cy="1.6" r="2.4" fill="#d9dde6"/></svg></div><div class="nm"></div><div class="pbar"><i></i></div><div class="sel">▼</div>';
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
    if ((a.back && a.path.length) || a.sitting === 'desk') cls.push('back');
    if (a.state === 'deliver' && a.path.length) cls.push('carry');
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

    const m = machineEls[a.desk];
    if (m) {
      m.classList.toggle('playing', a.state === 'work' && a.sitting === 'desk');
      m.classList.toggle('fever', (a.feverUntil || 0) > state.time);
    }

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

}

let dirty = true;
function renderUI() {
  const queued = D.tasks.filter((t) => t.status === 'queued');
  const doing = D.tasks.filter((t) => t.status === 'doing');
  const done = D.tasks.filter((t) => t.status === 'done').sort((x, y) => x.doneAt - y.doneAt);
  const totalDone = D.agents.reduce((s, a) => s + a.done, 0);

  $('#doneCount').textContent = DEPT_KEYS.reduce((s, k) => s + state.depts[k].agents.reduce((x, a) => x + a.done, 0), 0);
  $('#wbQueue').textContent = `待ち ${queued.length}`;
  $('#wbDoing').textContent = `稼働 ${doing.length}`;
  $('#wbDone').textContent = `大当り ${totalDone}`;
  const mvp = D.agents.slice().sort((a, b) => b.done - a.done)[0];
  $('#mvpName').textContent = mvp && mvp.done ? mvp.name : '-';
  $('#mvpCount').textContent = mvp && mvp.done ? `${mvp.done} 回` : '';

  // 部署タブ
  $('#deptTabs').innerHTML = DEPT_KEYS.map((k) => {
    const d = state.depts[k], dp = DEPTS[k];
    const busy = d.tasks.filter((t) => t.status === 'doing').length;
    const wait = d.tasks.filter((t) => t.status === 'queued').length;
    return `<button class="tab${k === state.view ? ' on' : ''}" data-dept="${k}" style="--c:${dp.theme.accent}">
      <span class="ti">${dp.icon}</span><b>${dp.name}</b><small>稼働 ${busy} ／ 待ち ${wait}</small></button>`;
  }).join('');

  $('#doingList').innerHTML = doing.length ? doing.map((t) => {
    const a = agentById(t.agentId);
    return `<li><span class="tag">${roles()[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(a ? a.name : '')}</span><span class="mini"><i style="width:${(t.progress / t.work * 100).toFixed(0)}%"></i></span></li>`;
  }).join('') : '<li class="empty">いまは誰も作業していません</li>';

  $('#roster').innerHTML = D.agents.map((a) => `
    <div class="chip" data-agent="${a.id}">
      <div class="face">${charSVG(a.look)}</div>
      <b>${esc(a.name)} <small>Lv${a.level}</small></b>
      <span class="role">${roles()[a.role].label}</span>
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
    return `<li><span class="tag">${roles()[t.type].icon}</span><span class="t">${t.urgent ? '<em class="urgent">急</em>' : ''}${esc(t.title)}</span><span class="meta">${DIFF[t.diff].label}${who ? ' → ' + esc(who.name) : ''}</span><button class="x" data-del="${t.id}" title="取り消す">✕</button></li>`;
  }).join('') : '<li class="empty">依頼待ちのタスクはありません</li>';

  $('#doneList').innerHTML = done.length ? done.slice().reverse().map((t) =>
    `<li class="clickable" data-result="${t.id}"><span class="tag">${roles()[t.type].icon}</span><span class="t">${esc(t.title)}</span><span class="meta">${esc(t.agentName || '')} ${DIFF[t.diff].label}</span></li>`
  ).join('') : '<li class="empty">まだ完了したタスクはありません</li>';

  const typeSel = $('#taskType');
  if (typeSel.dataset.dept !== D.key) {
    typeSel.dataset.dept = D.key;
    typeSel.innerHTML = Object.entries(roles()).map(([k, r]) => `<option value="${k}">${r.task}</option>`).join('');
    $('#taskTitle').placeholder = `例：${dp.ideas[Object.keys(dp.ideas)[0]][0]}`;
  }
  const sel = $('#taskAssignee'), cur = sel.value;
  sel.innerHTML = '<option value="">担当：おまかせ</option>' + D.agents.map((a) => `<option value="${a.id}">担当：${esc(a.name)}（${roles()[a.role].label}）</option>`).join('');
  sel.value = D.agents.some((a) => String(a.id) === cur) ? cur : '';
  $('#hireBtn').disabled = D.agents.length >= DESKS.length;
  $('#hireBtn').textContent = D.agents.length >= DESKS.length ? '台が満席' : '採用';
}

function statusText(a) {
  const t = taskById(a.taskId);
  switch (a.state) {
    case 'work': return `稼働中：${t ? t.title : ''}`;
    case 'toDesk': return '台へ移動';
    case 'deliver': return '景品交換へ';
    case 'coffee': return '休憩（自販機）';
    case 'sofa': return '休憩（ソファ）';
    case 'chat': return '会話中';
    case 'walk': return '巡回中';
    default: return t ? '作業待ち' : '待機';
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
    rs.innerHTML = Object.entries(roles()).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('');
  }
  rs.value = a.role;
  $('#agentLv').textContent = a.level;
  $('#agentXp').style.width = (a.xp / (a.level * 100) * 100) + '%';
  $('#agentEnergy').style.width = a.energy + '%';
  $('#agentStatus').textContent = statusText(a);
  $('#agentDone').textContent = `${DEPTS[D.key].name} ／ 完了 ${a.done}件 ／ ${a.desk + 1}番台`;

  const sw = (key, list) => list.map((c) => `<button class="sw${a.look[key] === c ? ' on' : ''}" style="background:${c}" data-look="${key}" data-val="${c}" aria-label="${c}"></button>`).join('');
  const opt = (key, map) => Object.entries(map).map(([k, v]) => `<button class="opt${a.look[key] === k ? ' on' : ''}" data-look="${key}" data-val="${k}">${v}</button>`).join('');
  $('#customizer').innerHTML = `
    <div class="grp"><span>髪型</span>${opt('style', STYLES)}</div>
    <div class="grp"><span>髪の色</span>${sw('hair', HAIRS)}</div>
    <div class="grp"><span>スーツ</span>${sw('outfit', OUTFITS)}</div>
    <div class="grp"><span>肌の色</span>${sw('skin', SKINS)}</div>
    <div class="grp"><span>小物</span>${opt('acc', ACCS)}</div>
    <div class="grp"><span>ネクタイ</span>${sw('accent', ACCENTS)}</div>`;
}

let candidate = null;
function rollCandidate() {
  candidate = { role: pick(Object.keys(roles())), look: randomLook() };
  $('#hirePreview').innerHTML = charSVG(candidate.look);
  // 自分で入力した名前は「別の候補」を押しても残す
  if (!$('#hireNameInput').dataset.typed) $('#hireNameInput').value = unusedName();
  $('#hireErr').textContent = '';
  $('#hireRole').textContent = `${DEPTS[D.key].name} ／ ${roles()[candidate.role].label}`;
  const freeDesk = DESKS.findIndex((_, i) => !D.agents.some((a) => a.desk === i));
  const btn = $('#confirmHire');
  btn.disabled = freeDesk < 0;
  btn.textContent = freeDesk < 0 ? '台が満席です' : `${DEPTS[D.key].name}に配属する`;
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
  a.bubble = { text: 'よろしくお願いします', until: state.time + 3 };
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
    who.a.bubble = { text: `今日から「${newName}」です`, until: state.time + 3 };
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
    text: `${DEPTS[dept].name}${hit ? `の${hit.a.name}` : ''}に「${title}」を依頼しました（${r.task}・${DIFF[diff].label}${urgent ? '・急ぎ' : ''}）`,
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
    <li class="${r.ok ? 'ok' : 'ng'}"><span class="q">${esc(r.input)}</span><span class="a">${r.ok ? '→' : '×'} ${esc(r.text)}</span></li>`).join('');
}

function renderCmdExamples() {
  const s = state.depts.sales.agents[0], a = state.depts.admin.agents[0];
  const ex = [
    s ? `${s.name}にC社へアポ電して` : '営業部でC社へアポ電して',
    '事務部で請求書の発行を急ぎでお願い',
    a ? `${a.name}は契約書のチェックをじっくりやって` : '契約書のチェックをじっくりやって',
    '営業部に中島という人を採用して',
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
    toast(`${DEPTS[D.key].name}に「${title}」を依頼しました`);
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
    $('#resultTitle').textContent = t.title;
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
      a.name = name; say(a, `今日から「${name}」です`);
      toast(`名前を「${name}」に変更しました`);
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
    toast(`${a.name}が${DEPTS[D.key].name}に配属されました`);
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
      btn.textContent = 'もう一度押すと消去';
      resetArmed = setTimeout(() => { resetArmed = null; btn.textContent = 'リセット'; }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; btn.textContent = 'リセット';
    toast('最初からやり直しました');
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
