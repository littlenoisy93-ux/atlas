window.AtlasProgress = (() => {
  const student = localStorage.getItem("atlasStudent") || "Scholar";
  const storageKey = "atlasMathProgress::" + student;

  function blankProgress() {
    return {
      coins: 0,
      streak: 0,
      total: 0,
      correct: 0,
      questions: {},
      topics: {}
    };
  }

  function finiteNumber(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function migrate(saved) {
    const clean = blankProgress();

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      return clean;
    }

    clean.coins = finiteNumber(saved.coins);
    clean.streak = finiteNumber(saved.streak);
    clean.total = finiteNumber(saved.total);
    clean.correct = finiteNumber(saved.correct);

    clean.questions =
      saved.questions && typeof saved.questions === "object" && !Array.isArray(saved.questions)
        ? saved.questions
        : {};

    clean.topics =
      saved.topics && typeof saved.topics === "object" && !Array.isArray(saved.topics)
        ? saved.topics
        : {};

    return clean;
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return migrate(saved);
    } catch {
      return blankProgress();
    }
  }

  const progress = load();

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }

  function ensureStats(collection, key) {
    if (!collection || typeof collection !== "object") {
      throw new TypeError("Atlas progress collection is unavailable.");
    }

    const existing = collection[key];

    if (!existing || typeof existing !== "object") {
      collection[key] = { seen: 0, correct: 0, wrong: 0 };
    } else {
      existing.seen = finiteNumber(existing.seen);
      existing.correct = finiteNumber(existing.correct);
      existing.wrong = finiteNumber(existing.wrong);
    }

    return collection[key];
  }

  function record(question, correct) {
    progress.total += 1;

    const questionStats = ensureStats(progress.questions, question.id);
    const topicStats = ensureStats(progress.topics, question.t);

    questionStats.seen += 1;
    topicStats.seen += 1;

    if (correct) {
      progress.correct += 1;
      progress.streak += 1;
      progress.coins += 10;
      questionStats.correct += 1;
      topicStats.correct += 1;
    } else {
      progress.streak = 0;
      questionStats.wrong += 1;
      topicStats.wrong += 1;
    }

    save();
  }

  function weight(question, lastId) {
    const questionStats =
      progress.questions[question.id] || { seen: 0, wrong: 0, correct: 0 };
    const topicStats =
      progress.topics[question.t] || { seen: 0, wrong: 0, correct: 0 };

    let result = 1;

    if (questionStats.seen === 0) result += 1.5;
    result += finiteNumber(questionStats.wrong) * 2;
    result += finiteNumber(topicStats.wrong) * 0.35;
    result -= finiteNumber(questionStats.correct) * 0.25;

    if (question.id === lastId) result *= 0.12;

    return Math.max(0.15, result);
  }

  function chooseWeighted(items, lastId) {
    if (!Array.isArray(items) || !items.length) return null;

    const weights = items.map(question => weight(question, lastId));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let draw = Math.random() * totalWeight;

    for (let index = 0; index < items.length; index += 1) {
      draw -= weights[index];
      if (draw <= 0) return items[index];
    }

    return items[items.length - 1];
  }

  save();

  return {
    student,
    progress,
    save,
    record,
    ensureStats,
    chooseWeighted
  };
})();
