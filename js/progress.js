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

  function load() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || blankProgress();
    } catch {
      return blankProgress();
    }
  }

  const progress = load();

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }

  function ensureStats(collection, key) {
    if (!collection[key]) {
      collection[key] = { seen: 0, correct: 0, wrong: 0 };
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

    let weight = 1;

    if (questionStats.seen === 0) weight += 1.5;
    weight += questionStats.wrong * 2;
    weight += topicStats.wrong * 0.35;
    weight -= questionStats.correct * 0.25;

    if (question.id === lastId) weight *= 0.12;

    return Math.max(0.15, weight);
  }

  function chooseWeighted(items, lastId) {
    const weights = items.map(question => weight(question, lastId));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let draw = Math.random() * total;

    for (let index = 0; index < items.length; index += 1) {
      draw -= weights[index];
      if (draw <= 0) return items[index];
    }

    return items[items.length - 1];
  }

  return {
    student,
    progress,
    save,
    record,
    ensureStats,
    chooseWeighted
  };
})();

