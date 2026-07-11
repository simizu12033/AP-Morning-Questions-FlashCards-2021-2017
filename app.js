const cards = window.AP_CARDS || [];
const storageKey = "ap-term-recall-progress-v1";

const categoryLabels = {
  all: "全部",
  technology: "テクノロジ",
  security: "セキュリティ",
  network: "ネットワーク",
  database: "データベース",
  development: "開発",
  management: "マネジメント",
  strategy: "ストラテジ",
};

let progress = loadProgress();
let filtered = [...cards];
let index = 0;

const el = {
  search: document.querySelector("#searchInput"),
  exam: document.querySelector("#examFilter"),
  category: document.querySelector("#categoryFilter"),
  mode: document.querySelector("#modeFilter"),
  shuffle: document.querySelector("#shuffleBtn"),
  reset: document.querySelector("#resetBtn"),
  count: document.querySelector("#countText"),
  missed: document.querySelector("#missedText"),
  starred: document.querySelector("#starredText"),
  progress: document.querySelector("#progressText"),
  accuracy: document.querySelector("#accuracyText"),
  examText: document.querySelector("#examText"),
  fieldText: document.querySelector("#fieldText"),
  source: document.querySelector("#sourceLink"),
  cue: document.querySelector("#cueText"),
  question: document.querySelector("#questionText"),
  visual: document.querySelector("#visualAid"),
  form: document.querySelector("#answerForm"),
  input: document.querySelector("#answerInput"),
  result: document.querySelector("#resultBox"),
  explanation: document.querySelector("#explanationText"),
  wrongHint: document.querySelector("#wrongHintBox"),
  prev: document.querySelector("#prevBtn"),
  next: document.querySelector("#nextBtn"),
  show: document.querySelector("#showBtn"),
  star: document.querySelector("#starBtn"),
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[ー－‐\s・()（）]/g, "")
    .trim();
}

function isCorrect(card, value) {
  const answer = normalize(value);
  return card.aliases.some((alias) => normalize(alias) === answer);
}

function isClose(card, value) {
  const answer = normalize(value);
  if (!answer) return "";
  const terms = new Set(Object.values(card.wrongHints || {}).join(" ").match(/[A-Z]{2,}|[A-Za-z][A-Za-z0-9+.-]{1,}|[ァ-ヶー]{2,}|[一-龠]{2,}/g) || []);
  return [...terms].find((term) => normalize(term) === answer) || "";
}

function setupFilters() {
  const exams = [...new Map(cards.map((card) => [card.exam, card.examLabel])).entries()];
  el.exam.innerHTML = `<option value="all">全部</option>${exams.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}`;
  const categories = [...new Set(cards.map((card) => card.category))];
  el.category.innerHTML = `<option value="all">全部</option>${categories.map((cat) => `<option value="${cat}">${categoryLabels[cat] || cat}</option>`).join("")}`;
}

function applyFilters() {
  const query = normalize(el.search.value);
  const exam = el.exam.value;
  const category = el.category.value;
  const mode = el.mode.value;
  filtered = cards.filter((card) => {
    const state = progress[card.id] || {};
    const haystack = normalize(`${card.term} ${card.topic} ${card.field} ${card.examLabel} ${card.cue}`);
    if (query && !haystack.includes(query)) return false;
    if (exam !== "all" && card.exam !== exam) return false;
    if (category !== "all" && card.category !== category) return false;
    if (mode === "unseen" && state.seen) return false;
    if (mode === "missed" && !state.missed) return false;
    if (mode === "starred" && !state.starred) return false;
    return true;
  });
  index = Math.min(index, Math.max(filtered.length - 1, 0));
  render();
}

function currentCard() {
  return filtered[index];
}

function render() {
  renderStats();
  const card = currentCard();
  if (!card) {
    el.cue.textContent = "条件に合うカードがありません";
    el.question.textContent = "検索条件をゆるめてください。";
    el.visual.innerHTML = "";
    el.input.value = "";
    el.result.hidden = true;
    return;
  }
  el.examText.textContent = `${card.examLabel} 問${card.qno}`;
  el.fieldText.textContent = card.field;
  el.source.href = card.sourceUrl;
  el.cue.textContent = card.cue;
  el.question.textContent = card.question;
  el.explanation.textContent = card.explanation;
  el.wrongHint.innerHTML = renderWrongHints(card);
  el.visual.innerHTML = renderVisual(card);
  el.input.value = "";
  el.result.hidden = true;
  el.result.className = "result";
  el.star.setAttribute("aria-pressed", Boolean(progress[card.id]?.starred));
  el.star.textContent = progress[card.id]?.starred ? "星付き" : "星を付ける";
  el.progress.textContent = `${index + 1} / ${filtered.length}`;
}

function renderStats() {
  const states = Object.values(progress);
  const correct = states.reduce((sum, s) => sum + (s.correct || 0), 0);
  const total = states.reduce((sum, s) => sum + (s.total || 0), 0);
  el.count.textContent = filtered.length;
  el.missed.textContent = cards.filter((card) => progress[card.id]?.missed).length;
  el.starred.textContent = cards.filter((card) => progress[card.id]?.starred).length;
  el.accuracy.textContent = total ? `正答率 ${Math.round((correct / total) * 100)}%` : "正答率 -";
}

function renderWrongHints(card) {
  const entries = Object.entries(card.wrongHints || {});
  if (!entries.length) return "";
  return `<div class="wrongList">${entries.map(([kana, text]) => `<div><strong>${kana}</strong> ${escapeHtml(text)}</div>`).join("")}</div>`;
}

function renderVisual(card) {
  const title = `<div class="visualTitle">${styleLabel(card.style)}で覚える</div>`;
  if (card.style === "origin") {
    const parts = splitTerm(card.term);
    return `${title}<div class="diagramOrigin"><div class="originWord">？？？</div><div class="originParts"><div><strong>答えるもの</strong>用語名を隠して思い出す</div><div><strong>役割</strong>${escapeHtml(card.cue)}</div></div></div>`;
  }
  if (card.style === "flow") {
    return `${title}<div class="diagramFlow"><div class="node">きっかけ</div><div class="arrow"></div><div class="node">？？？</div><div class="arrow"></div><div class="node">結果を判断</div></div>`;
  }
  if (card.style === "contrast") {
    const wrong = Object.values(card.wrongHints || {})[0] || "似た用語は目的・対象・タイミングで分ける。";
    return `${title}<div class="diagramContrast"><div class="contrastGrid"><div><strong>答え候補</strong>${escapeHtml(card.cue)}</div><div><strong>似た選択肢</strong>${escapeHtml(wrong)}</div></div></div>`;
  }
  if (card.style === "diagram") {
    return `${title}<div class="diagramStack"><div class="stackLayer"><strong>入力</strong>${escapeHtml(card.question.slice(0, 46))}</div><div class="stackLayer"><strong>見分ける特徴</strong>${escapeHtml(card.cue)}</div><div class="stackLayer"><strong>答える語</strong>？？？</div></div>`;
  }
  return `${title}<div class="diagramExample"><div class="exampleBox"><strong>場面</strong><br>${escapeHtml(card.field)}で問われる</div><div class="arrow"></div><div class="exampleBox"><strong>手掛かり</strong><br>${escapeHtml(card.cue)}</div><div class="arrow"></div><div class="exampleBox"><strong>用語</strong><br>？？？</div></div>`;
}

function styleLabel(style) {
  return {
    origin: "由来",
    flow: "流れ",
    contrast: "比較",
    diagram: "構造",
    example: "具体例",
  }[style] || "図";
}

function splitTerm(term) {
  if (/[A-Z]{2,}/.test(term)) return [term.replace(/([A-Z]{2,})/g, "$1 ").trim(), "略語は展開語と役割を一緒に覚える"];
  const mid = Math.ceil(term.length / 2);
  return [term.slice(0, mid), term.slice(mid)];
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markAnswer(ok) {
  const card = currentCard();
  if (!card) return;
  const state = progress[card.id] || { total: 0, correct: 0, seen: false, missed: false, starred: false };
  state.total += 1;
  state.correct += ok ? 1 : 0;
  state.seen = true;
  state.missed = !ok;
  progress[card.id] = state;
  saveProgress();
  renderStats();
}

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const card = currentCard();
  if (!card) return;
  const ok = isCorrect(card, el.input.value);
  markAnswer(ok);
  const close = isClose(card, el.input.value);
  el.result.hidden = false;
  el.result.className = `result ${ok ? "ok" : "ng"}`;
  if (ok) {
    el.result.innerHTML = `<strong>正解。</strong> ${escapeHtml(card.term)}。`;
  } else {
    const hint = close ? `「${escapeHtml(close)}」とは別物です。下の誤答メモで違いを確認してください。` : "手掛かりの対象・目的・タイミングを見直してください。";
    el.result.innerHTML = `<strong>もう一歩。</strong> 答えは ${escapeHtml(card.term)}。${hint}`;
  }
});

el.show.addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  el.result.hidden = false;
  el.result.className = "result ok";
  el.result.innerHTML = `<strong>答え:</strong> ${escapeHtml(card.term)}`;
  progress[card.id] = { ...(progress[card.id] || {}), seen: true };
  saveProgress();
  renderStats();
});

el.next.addEventListener("click", () => {
  index = filtered.length ? (index + 1) % filtered.length : 0;
  render();
  el.input.focus();
});

el.prev.addEventListener("click", () => {
  index = filtered.length ? (index - 1 + filtered.length) % filtered.length : 0;
  render();
});

el.star.addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  progress[card.id] = { ...(progress[card.id] || {}), starred: !progress[card.id]?.starred };
  saveProgress();
  render();
});

el.shuffle.addEventListener("click", () => {
  for (let i = filtered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  index = 0;
  render();
});

el.reset.addEventListener("click", () => {
  progress = {};
  saveProgress();
  render();
});

[el.search, el.exam, el.category, el.mode].forEach((control) => control.addEventListener("input", applyFilters));

setupFilters();
applyFilters();
