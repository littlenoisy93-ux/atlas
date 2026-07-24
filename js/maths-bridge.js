(() => {
  const QUESTIONS = window.ATLAS_QUESTIONS || [];
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

  const chapters = [...new Set(QUESTIONS.map(q => q.t))];

  const icons = {
    Nombres: "🔢",
    Priorités: "➗",
    Fractions: "◒",
    Décimaux: "·",
    Proportionnalité: "⚖️",
    Pourcentages: "%",
    Moyenne: "📊",
    Géométrie: "📐",
    "Calcul littéral": "x",
    Équations: "=",
    Logique: "🧩",
    Probabilités: "🎲"
  };

  $("studentLabel").textContent =
    "· " + (Progress.student || "Élève");

  function statsFor(name) {
    return Progress.ensureStats(
      Progress.progress.topics,
      name
    );
  }

  function starsFor(name) {
    const stats = statsFor(name);

    if (!stats.seen) return 0;

    const score = stats.correct / stats.seen;

    if (stats.seen >= 12 && score >= 0.9) return 5;
    if (stats.seen >= 9 && score >= 0.8) return 4;
    if (stats.seen >= 6 && score >= 0.7) return 3;
    if (stats.seen >= 3 && score >= 0.55) return 2;

    return 1;
  }

  function starsText(number) {
    return "★".repeat(number) + "☆".repeat(5 - number);
  }

  function renderBook() {
    const grid = $("bookChapters");
    grid.innerHTML = "";

    chapters.forEach((name, index) => {
      const stats = statsFor(name);
      const stars = starsFor(name);
      const button = document.createElement("button");

      button.className = "book-chapter";
      button.type = "button";

      button.innerHTML = `
        <span class="chapter-number">
          Chapitre ${index + 1}
        </span>

        <span class="chapter-name">
          ${icons[name] || "✦"} ${name}
        </span>

        <span class="chapter-stars">
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

      button.addEventListener("click", () => {
        openLesson(name);
      });

      grid.appendChild(button);
    });

    const totalStars = chapters.reduce(
      (total, name) => total + starsFor(name),
      0
    );

    const percent = chapters.length
      ? Math.round(totalStars / (chapters.length * 5) * 100)
      : 0;

    $("overallPercent").textContent = percent + " %";
    $("overallBar").style.width = percent + "%";
  }

  function pool() {
    const filtered = selected === "Tous"
      ? QUESTIONS
      : QUESTIONS.filter(q => q.t === selected);

    return filtered.length ? filtered : QUESTIONS;
  }

  function resetSession() {
    session = {
      answered: 0,
      correct: 0,
      topics: {}
    };
    current = null;
    answered = false;
    lastId = "";
  }

  function newQuestion() {
    if (session.answered >= 10) {
      showSummary(true);
      return;
    }

    current = Progress.chooseWeighted(pool(), lastId);
    lastId = current.id;
    answered = false;

    $("topic").textContent = current.t;
    $("prompt").textContent = current.q;
    if ($("instruction")) {
      $("instruction").textContent = current.i || "Réponds avec un nombre ou une expression courte.";
    }
    $("answer").value = "";
    $("feedback").className = "feedback";
    $("reminder").className = "reminder";
    $("check").disabled = false;
    $("sessionCount").textContent = session.answered;
    $("next").textContent = "Question suivante";

    setTimeout(() => $("answer").focus(), 50);
  }

  function openLesson(chapter) {
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
    }, 100);
  }

  function closeLesson() {
    resetSession();
    $("lessonScreen").classList.add("hidden");
    $("bookScreen").classList.remove("hidden");

    renderBook();
    window.scrollTo(0, 0);
  }

  function normalise(value) {
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/,/g, ".")
      .replace(/euros?/g, "")
      .replace(/€|cm²|cm2|cm|°/g, "")
      .replace(/\s/g, "");
  }

  function checkAnswer() {
    if (
      answered ||
      !current ||
      !$("answer").value.trim()
    ) {
      return;
    }

    answered = true;

    const answers = Array.isArray(current.a)
      ? current.a
      : [current.a];

    const correct = answers.some(answer =>
      normalise(answer) === normalise($("answer").value)
    );

    $("feedback").className =
      "feedback show " + (correct ? "good" : "bad");

    $("feedbackTitle").textContent =
      correct ? "✓ Bravo !" : "Pas encore.";

    $("explanation").textContent = current.r || "";
    $("check").disabled = true;

    Progress.record(current, correct);

    session.answered += 1;

    const topicStats = Progress.ensureStats(
      session.topics,
      current.t
    );

    topicStats.seen += 1;

    if (correct) {
      session.correct += 1;
      topicStats.correct += 1;
    } else {
      topicStats.wrong += 1;
    }

    $("sessionCount").textContent = session.answered;

    $("next").textContent =
      session.answered >= 10
        ? "Voir le résumé"
        : "Question suivante";

    updateStats();
  }

  function updateStats() {
    $("streak").textContent =
      Progress.progress.streak || 0;

    $("coins").textContent =
      Progress.progress.coins || 0;

    Progress.save();
    renderBook();
  }

  function percentage(correct, total) {
    return total
      ? Math.round(correct / total * 100) + " %"
      : "—";
  }

  function showSummary(sessionOnly) {
    const data = sessionOnly
      ? session.topics
      : Progress.progress.topics;

    $("summaryTitle").textContent = sessionOnly
      ? "Résumé de la session"
      : "Progrès de " + Progress.student;

    $("summaryIntro").textContent = sessionOnly
      ? "Atlas utilisera ces résultats pour choisir les prochaines questions."
      : "Les résultats sont enregistrés uniquement pour ce profil sur cet appareil.";

    $("sumAnswered").textContent = sessionOnly
      ? session.answered
      : Progress.progress.total;

    $("sumAccuracy").textContent = percentage(
      sessionOnly
        ? session.correct
        : Progress.progress.correct,
      sessionOnly
        ? session.answered
        : Progress.progress.total
    );

    $("sumCoins").textContent =
      Progress.progress.coins || 0;

    $("topicSummary").innerHTML = "";

    const names = Object.keys(data);

    if (!names.length) {
      $("topicSummary").innerHTML =
        "<p>Aucune réponse enregistrée pour l’instant.</p>";
    }

    names.forEach(name => {
      const stats = data[name];
      const line = document.createElement("div");

      line.className = "topic-line";

      line.innerHTML = `
        <span>${name}</span>
        <strong>
          ${stats.correct}/${stats.seen}
          · ${percentage(stats.correct, stats.seen)}
        </strong>
      `;

      $("topicSummary").appendChild(line);
    });

    $("summaryModal").classList.add("open");
  }

  $("continueBook").addEventListener("click", () => {
    openLesson("Tous");
  });

  $("backToBook").addEventListener("click", closeLesson);

  $("check").addEventListener("click", checkAnswer);

  $("answer").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      checkAnswer();
    }
  });

  $("next").addEventListener("click", () => {
    if (session.answered >= 10) {
      showSummary(true);
    } else {
      newQuestion();
    }
  });

  $("reminderBtn").addEventListener("click", () => {
    $("reminder").textContent =
      current.h || "Relis attentivement la question.";

    $("reminder").classList.toggle("show");
  });

  $("summaryBtn").addEventListener("click", () => {
    showSummary(false);
  });

  $("lessonSummaryBtn").addEventListener("click", () => {
    showSummary(false);
  });

  $("continueBtn").addEventListener("click", () => {
    $("summaryModal").classList.remove("open");
  });

  $("newSessionBtn").addEventListener("click", () => {
    resetSession();

    $("summaryModal").classList.remove("open");
    openLesson(selected);
  });

  updateStats();
})();
