(() => {
  const config = window.ATLAS_LANGUAGE_CONFIG || {};
  const QUESTIONS = window.ATLAS_LANGUAGE_QUESTIONS || [];
  const $ = id => document.getElementById(id);
  const student = localStorage.getItem("atlasStudent") || "Scholar";
  const key = "atlasLanguageProgress::" + (config.key || "language") + "::" + student;

  let selected = "Tous";
  let current = null;
  let lastId = "";
  let answered = false;
  let session = { answered: 0, correct: 0, topics: {} };

  function blankProgress() {
    return { total: 0, correct: 0, coins: 0, questions: {}, topics: {} };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return Object.assign(blankProgress(), saved || {});
    } catch {
      return blankProgress();
    }
  }

  const progress = load();
  progress.questions = progress.questions || {};
  progress.topics = progress.topics || {};

  function save() {
    localStorage.setItem(key, JSON.stringify(progress));
  }

  function ensureStats(collection, name) {
    if (!collection[name]) collection[name] = { seen: 0, correct: 0, wrong: 0 };
    return collection[name];
  }

  function stripAccents(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalise(value) {
    return stripAccents(String(value))
      .toLowerCase()
      .trim()
      .replace(/[’']/g, "'")
      .replace(/[¿?¡!.,;:]/g, "")
      .replace(/\s+/g, " ");
  }

  function chapters() {
    return [...new Set(QUESTIONS.map(q => q.t))];
  }

  function resetSession() {
    session = { answered: 0, correct: 0, topics: {} };
    current = null;
    lastId = "";
    answered = false;
  }

  function pool() {
    const filtered = selected === "Tous" ? QUESTIONS : QUESTIONS.filter(q => q.t === selected);
    return filtered.length ? filtered : QUESTIONS;
  }

  function chooseQuestion() {
    const items = pool();
    const weights = items.map(q => {
      const qs = progress.questions[q.id] || { seen: 0, wrong: 0, correct: 0 };
      let w = 1;
      if (!qs.seen) w += 1.5;
      w += (qs.wrong || 0) * 2;
      w -= (qs.correct || 0) * 0.25;
      if (q.id === lastId) w *= 0.1;
      return Math.max(0.15, w);
    });
    let total = weights.reduce((a,b) => a+b, 0);
    let draw = Math.random() * total;
    for (let i=0; i<items.length; i++) {
      draw -= weights[i];
      if (draw <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function renderBook() {
    const grid = $("chapterGrid");
    grid.innerHTML = "";
    chapters().forEach((name, index) => {
      const stats = ensureStats(progress.topics, name);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter-card";
      btn.innerHTML = `<strong>${index + 1}. ${name}</strong><span>${stats.seen ? `${stats.correct}/${stats.seen} correct` : "Pas encore commencé"}</span>`;
      btn.addEventListener("click", () => openLesson(name));
      grid.appendChild(btn);
    });
    $("coins").textContent = progress.coins || 0;
  }

  function openLesson(chapter) {
    selected = chapter;
    resetSession();
    $("bookScreen").classList.add("hidden");
    $("lessonScreen").classList.remove("hidden");
    $("currentChapterLabel").textContent = chapter === "Tous" ? "Tous les chapitres" : chapter;
    newQuestion();
  }

  function closeLesson() {
    resetSession();
    $("lessonScreen").classList.add("hidden");
    $("bookScreen").classList.remove("hidden");
    renderBook();
    window.scrollTo(0, 0);
  }

  function newQuestion() {
    if (session.answered >= 10) {
      showSummary(true);
      return;
    }
    current = chooseQuestion();
    lastId = current.id;
    answered = false;
    $("topic").textContent = current.t;
    $("prompt").textContent = current.q;
    $("instruction").textContent = current.i || "Écris une réponse courte.";
    $("answer").value = "";
    $("feedback").className = "feedback";
    $("hintbox").className = "hintbox";
    $("check").disabled = false;
    $("sessionCount").textContent = session.answered;
    setTimeout(() => $("answer").focus(), 50);
  }

  function checkAnswer() {
    if (answered || !current || !$("answer").value.trim()) return;
    answered = true;
    const answers = Array.isArray(current.a) ? current.a : [current.a];
    const user = normalise($("answer").value);
    const correct = answers.some(a => normalise(a) === user);

    $("feedback").className = "feedback show " + (correct ? "good" : "bad");
    $("feedbackTitle").textContent = correct ? "✓ Bravo !" : "Pas encore.";
    $("explanation").textContent = current.r || "";
    $("check").disabled = true;

    progress.total += 1;
    session.answered += 1;
    const qs = ensureStats(progress.questions, current.id);
    const ts = ensureStats(progress.topics, current.t);
    const sts = ensureStats(session.topics, current.t);
    qs.seen += 1; ts.seen += 1; sts.seen += 1;
    if (correct) {
      progress.correct += 1; progress.coins += 10; session.correct += 1;
      qs.correct += 1; ts.correct += 1; sts.correct += 1;
    } else {
      qs.wrong += 1; ts.wrong += 1; sts.wrong += 1;
    }
    save();
    $("coins").textContent = progress.coins || 0;
    $("sessionCount").textContent = session.answered;
    $("next").textContent = session.answered >= 10 ? "Voir le résumé" : "Question suivante";
  }

  function percent(c,t) { return t ? Math.round(c/t*100) + " %" : "—"; }

  function showSummary(sessionOnly) {
    const data = sessionOnly ? session.topics : progress.topics;
    $("summaryTitle").textContent = sessionOnly ? "Résumé de la session" : "Progrès";
    $("sumAnswered").textContent = sessionOnly ? session.answered : progress.total;
    $("sumAccuracy").textContent = percent(sessionOnly ? session.correct : progress.correct, sessionOnly ? session.answered : progress.total);
    $("sumCoins").textContent = progress.coins || 0;
    $("topicSummary").innerHTML = "";
    const names = Object.keys(data);
    if (!names.length) $("topicSummary").innerHTML = "<p>Aucune réponse enregistrée.</p>";
    names.forEach(name => {
      const s = data[name];
      const line = document.createElement("div");
      line.className = "topic-line";
      line.innerHTML = `<span>${name}</span><strong>${s.correct}/${s.seen} · ${percent(s.correct, s.seen)}</strong>`;
      $("topicSummary").appendChild(line);
    });
    $("summaryModal").classList.add("open");
  }

  document.documentElement.style.setProperty("--cover1", config.cover1 || "#68415e");
  document.documentElement.style.setProperty("--cover2", config.cover2 || "#38223a");
  $("bookIcon").textContent = config.icon || "✒️";
  $("bookTitle").textContent = config.title || "Language";
  $("bookSubtitle").textContent = config.subtitle || "Réviser un peu chaque jour.";
  $("topTitle").textContent = (config.icon || "✒️") + " " + (config.title || "Language");
  $("studentLabel").textContent = "· " + student;

  $("continueBook").addEventListener("click", () => openLesson("Tous"));
  $("backToBook").addEventListener("click", closeLesson);
  $("check").addEventListener("click", checkAnswer);
  $("answer").addEventListener("keydown", e => { if (e.key === "Enter") checkAnswer(); });
  $("next").addEventListener("click", () => session.answered >= 10 ? showSummary(true) : newQuestion());
  $("hintBtn").addEventListener("click", () => {
    $("hintbox").textContent = current.h || "Relis bien la consigne.";
    $("hintbox").classList.toggle("show");
  });
  $("summaryBtn").addEventListener("click", () => showSummary(false));
  $("lessonSummaryBtn").addEventListener("click", () => showSummary(false));
  $("continueBtn").addEventListener("click", () => $("summaryModal").classList.remove("open"));
  $("newSessionBtn").addEventListener("click", () => { $("summaryModal").classList.remove("open"); openLesson(selected); });

  renderBook();
})();
