const bank = window.BANK || [];
const $ = (s) => document.querySelector(s);
const topics = [...new Set(bank.map((q) => q[0]))];

const tips = [
  'Answer the easy questions first. Momentum is a strategy.',
  'Read code snippets one operator at a time.',
  'For Big O, focus on the dominant term.',
  'Flag uncertainty; your review list is your study plan.',
  'Break loops down to their boundary conditions.',
  'Track variable states step-by-step for trace questions.',
];

const STORAGE_KEY = 'cat1_practice_state_v1';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved state', e);
  }
  return null;
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        topic: state.topic,
        mode: state.mode,
        i: state.i,
        answers: state.answers,
        seconds: state.seconds,
      })
    );
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

const savedData = loadSavedState();

const state = {
  topic: savedData?.topic || 'All',
  mode: savedData?.mode || 'practice',
  items: [],
  i: typeof savedData?.i === 'number' ? savedData.i : 0,
  answers: savedData?.answers || {}, // question index -> { choice: number, correct: boolean }
  selected: null,
  checked: false,
  seconds: typeof savedData?.seconds === 'number' ? savedData.seconds : 3600,
};

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

function makeItems(resetProgress = false) {
  let base = state.topic === 'All' ? [...bank] : bank.filter((q) => q[0] === state.topic);
  state.items =
    state.mode === 'mock'
      ? shuffle(base).slice(0, Math.min(50, base.length))
      : state.mode === 'test'
      ? shuffle(base)
      : base;

  if (resetProgress) {
    state.i = 0;
    state.answers = {};
    state.selected = null;
    state.checked = false;
    state.seconds = state.mode === 'practice' ? 3600 : state.mode === 'test' ? 120 * 60 : 60 * 60;
    saveState();
  } else {
    if (state.i >= state.items.length) {
      state.i = 0;
    }
  }

  $('#clock').textContent = fmt(state.seconds);
  renderTopics();
  renderModes();
  render();
}

function fmt(n) {
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderTopics() {
  $('#topics').innerHTML = ['All', ...topics]
    .map(
      (t) =>
        `<button class="topic ${state.topic === t ? 'active' : ''}" data-topic="${t}">${t} <small>${
          t === 'All' ? bank.length : bank.filter((x) => x[0] === t).length
        }</small></button>`
    )
    .join('');

  document.querySelectorAll('[data-topic]').forEach((b) => {
    b.onclick = () => {
      state.topic = b.dataset.topic;
      makeItems(true);
    };
  });
}

function renderModes() {
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
    b.onclick = () => {
      state.mode = b.dataset.mode;
      makeItems(true);
    };
  });
}

function render() {
  const q = state.items[state.i];
  if (!q) return finish();

  const saved = state.answers[state.i];
  if (saved !== undefined) {
    state.selected = saved.choice;
    state.checked = state.mode === 'practice';
  } else if (state.selected === null && saved) {
    state.selected = saved.choice;
  }

  $('#topicLabel').textContent = q[0];
  $('#qCount').textContent = `${String(state.i + 1).padStart(2, '0')} / ${state.items.length}`;
  $('#questionNumber').textContent = `QUESTION ${String(state.i + 1).padStart(2, '0')}`;
  $('#question').textContent = q[1];
  $('#progress').style.width = `${((state.i + 1) / state.items.length) * 100}%`;

  const isPractice = state.mode === 'practice';
  const reveal = isPractice && state.checked && saved !== undefined;

  const answerNote = reveal
    ? `<p class="answer-key">Correct answer <b>${'ABCD'[q[3]]}</b> — ${q[2][q[3]]}</p>`
    : '';

  const feedbackNote = reveal
    ? `<p class="feedback">${
        saved.correct ? '✓ Correct — nice work.' : '✗ Incorrect — keep it in mind for the next one.'
      }</p>`
    : '';

  $('#answers').innerHTML =
    q[2]
      .map((a, i) => {
        let classes = ['answer'];
        if (state.selected === i) classes.push('selected');
        if (reveal) {
          if (i === q[3]) classes.push('correct');
          else if (state.selected === i) classes.push('incorrect');
        }
        return `<button class="${classes.join(' ')}" data-answer="${i}" ${
          reveal ? 'disabled' : ''
        }><b>${'ABCD'[i]}</b>${a}</button>`;
      })
      .join('') +
    answerNote +
    feedbackNote;

  // Bind answer button clicks
  document.querySelectorAll('[data-answer]').forEach((b) => {
    b.onclick = () => {
      if (reveal) return;
      const chosen = +b.dataset.answer;
      state.selected = chosen;

      // In test / mock mode, store selection immediately
      if (state.mode !== 'practice') {
        state.answers[state.i] = {
          choice: chosen,
          correct: chosen === q[3],
        };
      }
      saveState();
      render();
    };
  });

  // Next / Submit button
  const nextBtn = $('#next');
  nextBtn.disabled = state.selected === null;

  if (reveal) {
    nextBtn.textContent =
      state.i === state.items.length - 1 ? 'Finish session →' : 'Next question →';
    nextBtn.onclick = () => {
      state.i++;
      state.selected = null;
      state.checked = false;
      saveState();
      render();
    };
  } else if (isPractice) {
    nextBtn.textContent = 'Check answer →';
    nextBtn.onclick = () => {
      if (state.selected === null) return;
      state.answers[state.i] = {
        choice: state.selected,
        correct: state.selected === q[3],
      };
      state.checked = true;
      saveState();
      render();
    };
  } else {
    // Test / Mock mode
    nextBtn.textContent =
      state.i === state.items.length - 1 ? 'Submit assessment →' : 'Save & next →';
    nextBtn.onclick = () => {
      if (state.i === state.items.length - 1) {
        finish();
      } else {
        state.i++;
        state.selected = state.answers[state.i]?.choice ?? null;
        saveState();
        render();
      }
    };
  }

  // Skip / Clear button
  const skipBtn = $('#skip');
  skipBtn.textContent = isPractice ? 'Skip for now' : 'Clear answer';
  skipBtn.onclick = () => {
    if (isPractice) {
      state.i++;
      state.selected = null;
      state.checked = false;
      saveState();
      render();
    } else {
      delete state.answers[state.i];
      state.selected = null;
      saveState();
      render();
    }
  };

  renderMap();
  stats();
}

function renderMap() {
  $('#questionMap').innerHTML = state.items
    .map((_, i) => {
      const a = state.answers[i];
      let mark = '';
      if (state.mode === 'practice' && a) {
        mark = a.correct ? 'right' : 'wrong';
      } else if (a) {
        mark = 'answered';
      }
      return `<button class="map-btn ${i === state.i ? 'current' : ''} ${mark}" data-map="${i}">${
        i + 1
      }</button>`;
    })
    .join('');

  document.querySelectorAll('[data-map]').forEach((b) => {
    b.onclick = () => {
      state.i = +b.dataset.map;
      const saved = state.answers[state.i];
      state.selected = saved ? saved.choice : null;
      state.checked = state.mode === 'practice' && !!saved;
      saveState();
      render();
    };
  });
}

function stats() {
  const answeredList = Object.values(state.answers);
  const right = answeredList.filter((x) => x.correct).length;
  const isPractice = state.mode === 'practice';

  $('#correct').textContent = isPractice ? String(right).padStart(2, '0') : '—';
  $('#review').textContent = isPractice
    ? String(answeredList.filter((x) => !x.correct).length).padStart(2, '0')
    : '—';
  $('#answeredHero').textContent = answeredList.length;
  $('#accuracy').textContent =
    isPractice && answeredList.length ? `${Math.round((right / answeredList.length) * 100)}%` : '—';
  $('#tip').textContent = isPractice
    ? tips[answeredList.length % tips.length]
    : 'Answers stay hidden until you submit.';
}

function finish() {
  const answeredList = Object.values(state.answers);
  const right = answeredList.filter((x) => x.correct).length;
  $('#summaryScore').textContent = `${right} / ${state.items.length}`;
  $('#summaryText').textContent =
    state.mode === 'practice'
      ? `You got ${right} answers correct out of ${state.items.length}. Revisit your flagged questions and give the next round a cleaner run.`
      : `Assessment complete. Your score is ${right} / ${state.items.length}. Review each question below.`;
  $('#summary').showModal();
  if (state.mode !== 'practice') showReview();
}

function showReview() {
  const q = state.items;
  $('#question').textContent = 'Review your assessment';
  $('#topicLabel').textContent = 'ANSWER REVIEW';
  $('#answers').innerHTML = q
    .map((x, i) => {
      const a = state.answers[i];
      return `<div class="review-line ${
        a ? (a.correct ? 'review-right' : 'review-wrong') : 'review-wrong'
      }">
        <b>Q${i + 1}</b>
        <span>${x[2][x[3]]}</span>
        <small>${a ? 'Your answer: ' + x[2][a.choice] : 'Not answered'}</small>
      </div>`;
    })
    .join('');
  $('#next').style.display = 'none';
  $('#skip').style.display = 'none';
}

function reset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  makeItems(true);
  $('#next').style.display = '';
  $('#skip').style.display = '';
}

$('#reset').onclick = reset;
$('#restart').onclick = () => {
  $('#summary').close();
  reset();
};
$('#theme').onclick = () => document.body.classList.toggle('light');

setInterval(() => {
  if (state.seconds > 0) {
    state.seconds--;
    $('#clock').textContent = fmt(state.seconds);
    if (state.seconds % 10 === 0) saveState();
    if (!state.seconds) finish();
  }
}, 1000);

makeItems(false);
