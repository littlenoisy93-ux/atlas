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
        : "Atlas mélange les sujets et fera revenir plus souvent les notions qui ont besoin d’entraînement.";
  }

  function updateStats() {
    $("streak").textContent = Progress.progress.streak;
    $("coins").textContent = Progress.progress.coins;
    Progress.save();
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

  const topics = [
    "Tous",
    ...new Set(QUESTIONS.map(question => question.t))
  ];

  topics.forEach(name => {
    const button = document.createElement("button");

    button.className =
      "chapter" + (name === "Tous" ? " active" : "");

    button.textContent = name;

    button.addEventListener("click", () => {
      selected = name;

      document
        .querySelectorAll(".chapter")
        .forEach(item => item.classList.remove("active"));

      button.classList.add("active");
      lastId = "";
      newQuestion();
    });

    $("chapters").appendChild(button);
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

  $("continueBtn").addEventListener("click", () => {
    $("summaryModal").classList.remove("open");

    if (session.answered >= 10) {
      session = {
        answered: 0,
        correct: 0,
        topics: {}
      };

      newQuestion();
    }
  });

  $("newSessionBtn").addEventListener("click", () => {
    session = {
      answered: 0,
      correct: 0,
      topics: {}
    };

    $("summaryModal").classList.remove("open");
    newQuestion();
  });

  updateStats();
  newQuestion();
})();

