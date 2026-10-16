
import { useEffect, useState } from "react";
import "./App.css";

const STORAGE_KEY = "trivia-battle-leaderboard";

const decodeText = (text) => {
  const element = document.createElement("textarea");
  element.innerHTML = text;
  return element.value;
};

const difficultyNames = {
  easy: "KÖNNYŰ",
  medium: "KÖZEPES",
  hard: "NEHÉZ",
};

function loadLeaderboard() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function App() {
  const [difficulty, setDifficulty] = useState("easy");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);

  const [playerName, setPlayerName] = useState("");
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard);
  const [savedResult, setSavedResult] = useState(false);

  const finished = started && currentQuestion >= questions.length;
  const question = questions[currentQuestion];

  async function startGame(level = difficulty) {
    setLoading(true);
    setError("");
    setStarted(false);
    setQuestions([]);
    setScore(0);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setTimeLeft(10);
    setSavedResult(false);

    try {
      const url = `https://opentdb.com/api.php?amount=5&difficulty=${level}&type=multiple`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Nem sikerült elérni a kérdésszervert.");
      }

      const data = await response.json();

      if (data.response_code !== 0 || data.results.length < 5) {
        throw new Error(
          "Nem érkezett elég kérdés. Próbálj másik nehézségi szintet!"
        );
      }

      const preparedQuestions = data.results.map((item) => ({
        question: decodeText(item.question),
        correct: decodeText(item.correct_answer),
        answers: [
          ...item.incorrect_answers.map(decodeText),
          decodeText(item.correct_answer),
        ].sort(() => Math.random() - 0.5),
      }));

      setQuestions(preparedQuestions);
      setStarted(true);
    } catch (err) {
      setError(
        err.message || "Hiba történt a kérdések betöltésekor."
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseAnswer(answer) {
    if (selectedAnswer !== null || !question) return;

    setSelectedAnswer(answer);

    if (answer === question.correct) {
      setScore((previous) => previous + 1);
    }
  }

  function nextQuestion() {
    setCurrentQuestion((previous) => previous + 1);
    setSelectedAnswer(null);
    setTimeLeft(10);
  }

  function saveResult(event) {
    event.preventDefault();

    const cleanName = playerName.trim();

    if (!cleanName) {
      setError("Kérlek, írd be a nevedet!");
      return;
    }

    const newResult = {
      name: cleanName.slice(0, 20),
      score,
      total: questions.length,
      difficulty,
      date: new Date().toISOString(),
    };

    const updatedLeaderboard = [...leaderboard, newResult]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedLeaderboard)
      );

      setLeaderboard(updatedLeaderboard);
      setPlayerName("");
      setError("");
      setSavedResult(true);
    } catch {
      setError("Nem sikerült elmenteni az eredményt.");
    }
  }

  function backToHome() {
    setStarted(false);
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setError("");
    setSavedResult(false);
  }

  useEffect(() => {
    if (!started || finished || selectedAnswer !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          setSelectedAnswer("__timeout__");
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, finished, currentQuestion, selectedAnswer]);

  return (
    <div className="app">
      <div className="quiz-card">
        <div className="game-icon">🧠</div>

        <p className="subtitle">TEDD PRÓBÁRA A TUDÁSOD!</p>

        <h1>
          TRIVIA <span>BATTLE</span>
        </h1>

        {!started && !loading && (
          <>
            <p className="description">
              Készen állsz a kihívásra?
              <br />
              Válaszd ki a nehézséget, és kezdj játszani!
            </p>

            <div className="difficulty-options">
              {["easy", "medium", "hard"].map((level) => (
                <button
                  key={level}
                  className={`difficulty-button ${
                    difficulty === level ? "active" : ""
                  }`}
                  onClick={() => setDifficulty(level)}
                >
                  {difficultyNames[level]}
                </button>
              ))}
            </div>

            <div className="game-info">
              <div className="info-box">
                <span>❓</span>
                <strong>5</strong>
                <small>Kérdés</small>
              </div>

              <div className="info-box">
                <span>⏱️</span>
                <strong>10 mp</strong>
                <small>Kérdésenként</small>
              </div>

              <div className="info-box">
                <span>🏆</span>
                <strong>5</strong>
                <small>Max. pont</small>
              </div>
            </div>

            <button
              className="start-button"
              onClick={() => startGame()}
              disabled={loading}
            >
              Játék indítása →
            </button>

            {error && <p className="error-message">{error}</p>}

            <Leaderboard leaderboard={leaderboard} />
          </>
        )}

        {loading && (
          <p className="description">Kérdések betöltése...</p>
        )}

        {started && question && (
          <div className="question-area">
            <div className="question-meta">
              <span>
                {currentQuestion + 1}. kérdés / {questions.length}
              </span>
              <span className="timer">⏱️ {timeLeft} mp</span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${(currentQuestion / questions.length) * 100}%`,
                }}
              />
            </div>

            <p className="question-text">{question.question}</p>

            <div className="answers">
              {question.answers.map((answer) => {
                let answerClass = "answer-button";

                if (selectedAnswer !== null) {
                  if (answer === question.correct) {
                    answerClass += " correct";
                  } else if (answer === selectedAnswer) {
                    answerClass += " incorrect";
                  }
                }

                return (
                  <button
                    key={answer}
                    className={answerClass}
                    onClick={() => chooseAnswer(answer)}
                    disabled={selectedAnswer !== null}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>

            {selectedAnswer !== null && (
              <div className="feedback">
                <p>
                  {selectedAnswer === "__timeout__"
                    ? "Lejárt az idő!"
                    : selectedAnswer === question.correct
                      ? "Helyes válasz! 🎉"
                      : "Sajnos nem jó! ❌"}
                </p>

                <button className="start-button" onClick={nextQuestion}>
                  {currentQuestion === questions.length - 1
                    ? "Eredmények megtekintése"
                    : "Következő kérdés →"}
                </button>
              </div>
            )}

            <p className="score-text">
              Pontszám: {score} / {questions.length}
            </p>
          </div>
        )}

        {finished && (
          <div className="results">
            <h2>🏆 Véget ért a kvíz!</h2>

            <p className="final-score">
              {score} / {questions.length}
            </p>

            <p className="description">
              {score === 5
                ? "Tökéletes eredmény! Fantasztikus! 🔥"
                : score >= 3
                  ? "Szép munka! Ügyesen játszottál! 🎉"
                  : "Gyakorolj még egy kicsit, és próbáld újra! 💪"}
            </p>

            {!savedResult && (
              <form className="name-form" onSubmit={saveResult}>
                <label htmlFor="player-name">
                  Milyen néven kerülj fel a ranglistára?
                </label>

                <input
                  id="player-name"
                  className="name-input"
                  type="text"
                  placeholder="Írd be a neved..."
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={20}
                  required
                />

                <button className="start-button" type="submit">
                  Eredmény mentése 🏆
                </button>

                {error && <p className="error-message">{error}</p>}
              </form>
            )}

            {savedResult && (
              <p className="success-message">
                ✅ Az eredményedet elmentettük!
              </p>
            )}

            <Leaderboard leaderboard={leaderboard} />

            <button
              className="start-button"
              onClick={() => startGame()}
            >
              Új játék ↻
            </button>

            <button className="home-button" onClick={backToHome}>
              Vissza a főoldalra
            </button>
          </div>
        )}

        <p className="footer-text">TRIVIA BATTLE · 2026</p>
      </div>
    </div>
  );
}

function Leaderboard({ leaderboard }) {
  return (
    <div className="leaderboard">
      <h2>🏆 Legjobb 5 játékos</h2>

      {leaderboard.length === 0 ? (
        <p className="leaderboard-empty">
          Még nincs eredmény. Legyél te az első!
        </p>
      ) : (
        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li
              className="leaderboard-item"
              key={`${entry.name}-${entry.date}`}
            >
              <span className="leaderboard-rank">
                {["🥇", "🥈", "🥉", "4.", "5."][index]}
              </span>

              <span className="leaderboard-name">{entry.name}</span>

              <strong className="leaderboard-score">
                {entry.score}/{entry.total}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default App;
