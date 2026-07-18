(() => {
  const QUESTIONS = window.ATLAS_QUESTIONS;
  const Progress = window.AtlasProgress;
  const $ = id => document.getElementById(id);

  let selected = "Tous";
  let current = null;
  let lastId = "";
  let answered = false;

  let session = {
    answered: 0,
    correct: 0,
    topics: {}
  };

  const chapterNames = [
    ...new Set(QUESTIONS.map(question => question.t))
  ];

  $("studentLabel").textContent = "· " + Progress.student;

  function normalise(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/,/g, ".")
      .replace(/€|cm²|cm2|cm|°/g, "")
      .replace(/\s/g, "");
  }

  function ensureTopicStats(name) {
    return Progress.ensureStats(Progress.progress.topics, name);
  }

  function topicAccuracy(name) {
    const stats = ensureTopicStats(name);

    return stats.seen
      ? stats.correct / stats.seen
      : 0;
  }

  function topicStars(name) {
    const stats = ensureTopicStats(name);

    if (!stats.seen) return 0;

    const accuracy = stats.correct / stats.seen;

    if (stats.seen >= 12 && accuracy >= 0.9) return 5;
    if (stats.seen >= 9 && accuracy >= 0.8) return 4;
    if (stats.seen >= 6 && accuracy >= 0.7) return 3;
    if (stats.seen >= 3 && accuracy >= 0.55) return 2;

    return 1;
  }

  function starsText(count) {
    return "★".repeat(count) + "☆".repeat(5 - count);
  }

  function overallProgress() {
    if (!chapterNames.length) return 0;

    const totalStars = chapterNames.reduce(
      (sum, name) => sum + topicStars(name),
      0
    );

    return Math.round(
      (totalStars / (chapterNames.length * 5)) * 100
    );
  }

  function renderBook() {
    const grid = $("bookChapters");
    grid.innerHTML = "";

    chapterNames.forEach((name, index) => {
      const stats = ensureTopicStats(name);
      const stars = topicStars(name);
      const button = document.createElement("button");

      button.className = "book-chapter";
      button.innerHTML = `
        <span class="chapter-number">Chapitre ${index + 1}</span>
        <span class="chapter-name">${name}</span>
        <span class="chapter-stars" aria-label="${stars} étoiles sur 5">
          ${starsText(stars)}
        </span>
        <span class="chapter-score">
          ${
            stats.seen
              ? `${stats.correct}/${stats.seen} réponses correctes`
              : "Pas encore commencé"
          }
        </span>
      `;

      button.addEventListener("click", () => openLesson(name));
      grid.appendChild(button);
    });

    const percent = overallProgress();

    $("overallPercent").textContent = percent + " %";
    $("overallBar").style.width = percent + "%";
  }

  function questionPool() {
    return selected === "Tous"
      ? QUESTIONS
      : QUESTIONS.filter(question => question.t === selected);
  }

  function newQuestion() {
    if (session.answered >= 10) {
      showSummary(true);
      return;
    }

    current = Progress.chooseWeighted(questionPool(), lastId);
    lastId = current.id;
    answered = false;

    $("topic").textContent = current.t;
    $("prompt").textContent = current.q;
    $("answer").value = "";
    $("feedback").className = "feedback";
    $("reminder").className = "reminder";
    $("check").disabled = false;
    $("sessionCount").textContent = session.answered;
    $("next").textContent = "Question suivante";
    $("answer").focus();

    const questionStats = Progress.progress.questions[current.id];

    $("adaptiveNote").textContent =
      questionStats && questionStats.wrong > questionStats.correct
        ? "Cette notion revient parce qu’elle mérite encore un peu d’entraînement."
        : "Atlas fera revenir plus souvent les notions qui ont besoin d’entraînement.";
  }

  function updateStats() {
    $("streak").textContent = Progress.progress.streak;
    $("coins").textContent = Progress.progress.coins;
    Progress.save();
    renderBook();
  }

  function openLesson(chapter = "Tous") {
    selected = chapter;
    lastId = "";

    $("bookScreen").classList.add("hidden");
    $("lessonScreen").classList.remove("hidden");

    $("currentChapterLabel").textContent =
      chapter === "Tous"
        ? "Tous les chapitres"
        : chapter;

    newQuestion();

    setTimeout(() => {
      if (window.AtlasScratchpad) {
        window.AtlasScratchpad.redraw();
      }
    }, 80);
  }

  function closeLesson() {
    $("lessonScreen").classList.add("hidden");
    $("bookScreen").classList.remove("hidden");
    renderBook();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkAnswer() {
    if (answered || !$("answer").value.trim()) return;

    answered = true;

    const correct = current.a.some(
      accepted => normalise(accepted) === normalise($("answer").value)
    );

    $("feedback").className =
      "feedback show " + (correct ? "good" : "bad");

    $("feedbackTitle").textContent =
      correct ? "✓ Bravo !" : "Pas encore.";

    $("explanation").textContent = current.r;
    $("check").disabled = true;

    Progress.record(current, correct);

    session.answered += 1;

    const sessionTopic =
      Progress.ensureStats(session.topics, current.t);

    sessionTopic.seen += 1;

    if (correct) {
      session.correct += 1;
      sessionTopic.correct += 1;
    } else {
      sessionTopic.wrong += 1;
    }

    $("sessionCount").textContent = session.answered;
    $("next").textContent =
      session.answered >= 10
        ? "Voir le résumé"
        : "Question suivante";

    updateStats();
  }

  $("continueBook").addEventListener("click", () => {
    const weakest = [...chapterNames].sort(
      (first, second) =>
        topicAccuracy(first) - topicAccuracy(second)
    )[0];

    const hasProgress = chapterNames.some(
      name => ensureTopicStats(name).seen > 0
    );

    openLesson(hasProgress ? weakest : "Tous");
  });

  $("backToBook").addEventListener("click", closeLesson);
  $("check").addEventListener("click", checkAnswer);

  $("answer").addEventListener("keydown", event => {
    if (event.key === "Enter") checkAnswer();
  });

  $("next").addEventListener("click", () => {
    session.answered >= 10
      ? showSummary(true)
      : newQuestion();
  });

  $("reminderBtn").addEventListener("click", () => {
    $("reminder").textContent = current.h;
    $("reminder").classList.toggle("show");
  });

  function percentage(correct, total) {
    return total
      ? Math.round((correct / total) * 100) + " %"
      : "—";
  }

  function percentageNumber(stats) {
    return stats.seen
      ? stats.correct / stats.seen
      : 1;
  }

  function showSummary(sessionOnly = false) {
    $("summaryTitle").textContent =
      sessionOnly
        ? "Résumé de la session"
        : "Progrès de " + Progress.student;

    $("summaryIntro").textContent =
      sessionOnly
        ? "Atlas utilisera ces résultats pour choisir les prochaines questions."
        : "Les résultats ci-dessous sont enregistrés uniquement pour ce profil sur cet appareil.";

    $("sumAnswered").textContent =
      sessionOnly
        ? session.answered
        : Progress.progress.total;

    $("sumAccuracy").textContent = percentage(
      sessionOnly ? session.correct : Progress.progress.correct,
      sessionOnly ? session.answered : Progress.progress.total
    );

    $("sumCoins").textContent = Progress.progress.coins;

    const box = $("topicSummary");
    const data =
      sessionOnly
        ? session.topics
        : Progress.progress.topics;

    box.innerHTML = "";

    const names = Object.keys(data).sort(
      (first, second) =>
        percentageNumber(data[first]) -
        percentageNumber(data[second])
    );

    if (!names.length) {
      box.innerHTML =
        "<p>Aucune réponse enregistrée pour l’instant.</p>";
    }

    names.forEach(name => {
      const stats = data[name];
      const line = document.createElement("div");

      line.className = "topic-line";
      line.innerHTML =
        "<span>" + name + "</span>" +
        "<strong>" +
        stats.correct + "/" + stats.seen +
        " · " +
        percentage(stats.correct, stats.seen) +
        "</strong>";

      box.appendChild(line);
    });

    $("summaryModal").classList.add("open");
  }

  $("summaryBtn").addEventListener("click", () => {
    showSummary(false);
  });

  $("lessonSummaryBtn").addEventListener("click", () => {
    showSummary(false);
  });

  $("continueBtn").addEventListener("click", () => {
    $("summaryModal").classList.remove("open");

    if (session.answered >= 10) {
      session = {
        answered: 0,
        correct: 0,
        topics: {}
      };

      closeLesson();
    }
  });

  $("newSessionBtn").addEventListener("click", () => {
    session = {
      answered: 0,
      correct: 0,
      topics: {}
    };

    $("summaryModal").classList.remove("open");
    openLesson(selected);
  });

  updateStats();
  renderBook();
})();
