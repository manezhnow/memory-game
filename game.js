const DIFFICULTY_SETTINGS = {
    easy: {pairs: 6, attempts: 24, time: 120},
    medium: {pairs: 8, attempts: 28, time: 180},
    hard: {pairs: 12, attempts: 36, time: 180},
};

const ICONS_ARRAY = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
];

const FLIP_DELAY = 750;
const RESET_DELAY = 500;
const TIMER_INTERVAL = 1000;

const container = document.querySelector('.main');

const settingsContainer = container.querySelector('.settings');
const modeSelector = settingsContainer.querySelector('#game-mode');
const difficultySelector = settingsContainer.querySelector('#game-difficulty');
const startGameButton = settingsContainer.querySelector('.start-game-button');

const resultsContainer = container.querySelector('.results');
const noResultsContainer = resultsContainer.querySelector('.results__empty');

const gameContainer = container.querySelector('.game');
const gameCardsContainer = gameContainer.querySelector('.game__cards');
const gameCounterContainer = gameContainer.querySelector('.stat--pairs');
const gameAttemptsContainer = gameContainer.querySelector('.stat--attempts');
const gameTimerContainer = gameContainer.querySelector('.stat--timer');
const gamePairs = gameCounterContainer.querySelector('.game__counter');
const gameAttempts = gameAttemptsContainer.querySelector('.game__attempts');
const gameTimer = gameTimerContainer.querySelector('.game__timer');

const modalContainer = container.querySelector('.modal');
const modalMessage = modalContainer.querySelector('.modal__message');
const modalCurrentResult = modalContainer.querySelector('.modal__current-result');
const modalBestResult = modalContainer.querySelector('.modal__best-result');

const restartButtons = container.querySelectorAll('.restart-button');
const backToMenuButtons = container.querySelectorAll('.back-to-menu-button');

let currentMode = '';
let currentDifficulty = '';
let totalPairs = 0;
let totalAttempts = 0;
let totalTime = 0;
let timeLeft = 0;
let gameStartTime = 0;
let pairsCounter = 0;
let attemptsCounter = 0;
let guessPair = [];
let timerId = null;
let timeoutId = null;
let flipTimeoutId = null;
let isLocked = false;
let isGameOver = false;

function initGame() {
    loadBestScores();
    startGameButton.addEventListener('click', startGame);
    restartButtons.forEach(btn => btn.addEventListener('click', resetGame));
    backToMenuButtons.forEach(btn => btn.addEventListener('click', backToMenu));
}

function startGame() {
    currentMode = modeSelector.value;
    currentDifficulty = difficultySelector.value;
    const {pairs, attempts, time} = DIFFICULTY_SETTINGS[currentDifficulty];

    totalPairs = pairs;
    totalAttempts = attempts;
    totalTime = time;

    settingsContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    prepareNewGame();
    createCards();

    gameCounterContainer.classList.remove('hidden');
    renderPairsCounter();

    switch (currentMode) {
        case 'limited':
            gameAttemptsContainer.classList.remove('hidden');
            renderAttemptsCounter();
            break;
        case 'timed':
            gameTimerContainer.classList.remove('hidden');
            renderTimer();
            break;
    }
}

function createCards() {
    gameCardsContainer.classList.add(currentDifficulty);

    const icons = shuffleArray(ICONS_ARRAY).slice(0, totalPairs);
    const iconsDoubled = [...icons, ...icons];
    const iconsShuffled = shuffleArray(iconsDoubled);

    for (let i = 0; i < iconsShuffled.length; i++) {
        const card = document.createElement('div');
        card.classList.add('flip-card');

        const cardInner = document.createElement('div');
        cardInner.classList.add('flip-card-inner');

        const cardFront = document.createElement('div');
        cardFront.classList.add('flip-card-front');

        const cardBack = document.createElement('div');
        cardBack.classList.add('flip-card-back');
        cardBack.textContent = iconsShuffled[i];

        card.appendChild(cardInner);
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        gameCardsContainer.appendChild(card);

        card.addEventListener('click', () => flipCard(card));
    }
}

function flipCard(card) {
    if (isGameOver) return;
    if (isLocked) return;
    if (card.classList.contains('flipped')) return;
    if (card.classList.contains('matched')) return;

    if (gameStartTime === 0) {
        gameStartTime = Date.now();
        if (currentMode === 'timed') {
            startTimer();
        }
    }

    card.classList.add('flipped');
    guessPair.push(card);

    if (guessPair.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    const [card1, card2] = guessPair;
    const icon1 = card1.querySelector('.flip-card-back').textContent;
    const icon2 = card2.querySelector('.flip-card-back').textContent;

    attemptsCounter++;

    if (currentMode === 'limited') {
        renderAttemptsCounter();
    }

    if (icon1 === icon2) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        pairsCounter++;
        renderPairsCounter();
        guessPair = [];

        if (pairsCounter === totalPairs) {
            endGame(true);
            return;
        }
    } else {
        isLocked = true;
        flipTimeoutId = setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            guessPair = [];
            isLocked = false;
        }, FLIP_DELAY);
    }

    if (currentMode === 'limited' && attemptsCounter >= totalAttempts) {
        endGame(false);
    }
}

function endGame(isWin) {
    stopTimer();
    isGameOver = true;

    const timePlayed = Math.floor((Date.now() - gameStartTime) / 1000);

    gameContainer.classList.add('hidden');
    modalContainer.classList.remove('hidden');

    modalMessage.textContent = isWin
        ? '🥳 Победа! Так держать!'
        : '🫨 Поражение... Попробуй еще раз!';

    renderCurrentResult(timePlayed);

    if (isWin) {
        renderBestResult(timePlayed);
        saveBestScore();
    } else {
        modalBestResult.textContent = '';
    }
}

function startTimer() {
    stopTimer();
    timeLeft = totalTime;
    renderTimer();

    timerId = setInterval(() => {
        timeLeft--;
        renderTimer();

        if (timeLeft <= 0) {
            stopTimer();
            timeLeft = 0;
            renderTimer();
            endGame(false);
        }
    }, TIMER_INTERVAL);
}

function stopTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function resetGame() {
    stopTimer();

    if (!modalContainer.classList.contains('hidden')) {
        modalContainer.classList.add('hidden');
        startGame();
    } else {
        unflipAllCards();
        timeoutId = setTimeout(() => {
            startGame();
        }, RESET_DELAY);
    }
}

function backToMenu() {
    stopTimer();
    clearAllTimeouts();

    gameCardsContainer.innerHTML = '';
    gameContainer.classList.add('hidden');
    modalContainer.classList.add('hidden');
    settingsContainer.classList.remove('hidden');
    resultsContainer.classList.remove('hidden');

    resetState();
    loadBestScores();
}

function prepareNewGame() {
    stopTimer();
    clearAllTimeouts();

    gameCardsContainer.classList.remove('easy', 'medium', 'hard');
    gameCardsContainer.innerHTML = '';
    gameCounterContainer.classList.add('hidden');
    gameAttemptsContainer.classList.add('hidden');
    gameTimerContainer.classList.add('hidden');

    resetState();
}

function resetState() {
    timeLeft = totalTime;
    gameStartTime = 0;
    pairsCounter = 0;
    attemptsCounter = 0;
    guessPair = [];
    isLocked = false;
    isGameOver = false;
}

function clearAllTimeouts() {
    clearTimeout(timeoutId);
    clearTimeout(flipTimeoutId);
    timeoutId = null;
    flipTimeoutId = null;
}

function renderCurrentResult(timePlayed) {
    const pairsText = `Пар отгадано: ${pairsCounter} из ${totalPairs}.`;

    const details = currentMode === 'limited'
        ? `Попыток использовано: ${attemptsCounter} из ${totalAttempts}.`
        : `Время: ${formatTime(timePlayed)}.`;

    modalCurrentResult.textContent = `${pairsText} ${details}`;
}

function renderBestResult(timePlayed) {
    const key = `${currentMode}_${currentDifficulty}`;
    const bestResult = localStorage.getItem(key);

    const recordChecks = {
        basic: () => bestResult === null || timePlayed < Number(bestResult),
        limited: () => bestResult === null || attemptsCounter < Number(bestResult),
        timed: () => bestResult === null || timeLeft > Number(bestResult)
    };

    const bestResultFormatters = {
        basic: () => `Лучший результат: ${formatTime(Number(bestResult))}.`,
        limited: () => `Лучший результат: ${Number(bestResult)} попыток.`,
        timed: () => `Лучший результат: ${formatTime(totalTime - Number(bestResult))}.`
    };

    const isNewRecord = recordChecks[currentMode]();

    modalBestResult.textContent = isNewRecord
        ? '🏆 Это новый рекорд!'
        : bestResultFormatters[currentMode]();
}

function saveBestScore() {
    const key = `${currentMode}_${currentDifficulty}`;
    const bestResult = localStorage.getItem(key);

    const currentResults = {
        basic: Math.floor((Date.now() - gameStartTime) / 1000),
        limited: attemptsCounter,
        timed: timeLeft
    };

    const currentResult = currentResults[currentMode];

    const isBetter = currentMode === 'timed'
        ? currentResult > Number(bestResult)
        : currentResult < Number(bestResult);

    if (bestResult === null || isBetter) {
        localStorage.setItem(key, JSON.stringify(currentResult));
    }
}

function loadBestScores() {
    const modes = ['basic', 'limited', 'timed'];
    const difficulties = Object.keys(DIFFICULTY_SETTINGS);
    const results = {};

    modes.forEach(mode => {
        difficulties.forEach(difficulty => {
            const key = `${mode}_${difficulty}`;
            results[key] = localStorage.getItem(key);
        });
    });

    const hasAnyResult = Object.values(results).some(value => value !== null);

    if (hasAnyResult) {
        noResultsContainer.classList.add('hidden');

        modes.forEach(mode => {
            const hasModeResult = difficulties.some(diff => results[`${mode}_${diff}`] !== null);
            const modeContainer = resultsContainer.querySelector(`.results__mode--${mode}`);

            if (hasModeResult) {
                modeContainer.classList.remove('hidden');

                difficulties.forEach(diff => {
                    const value = results[`${mode}_${diff}`];
                    const cell = modeContainer.querySelector(`tr[data-difficulty="${diff}"] .result-value`);

                    if (value !== null) {
                        if (mode === 'limited') {
                            cell.textContent = `${value} попыток`;
                        } else if (mode === 'timed') {
                            const total = DIFFICULTY_SETTINGS[diff].time;
                            cell.textContent = formatTime(total - Number(value));
                        } else {
                            cell.textContent = formatTime(Number(value));
                        }
                    } else {
                        cell.textContent = '-';
                    }
                });
            } else {
                modeContainer.classList.add('hidden');
            }
        });
    } else {
        noResultsContainer.classList.remove('hidden');
    }
}

function renderPairsCounter() {
    gamePairs.textContent = `${pairsCounter} / ${totalPairs}`;
}

function renderAttemptsCounter() {
    gameAttempts.textContent = `${totalAttempts - attemptsCounter} / ${totalAttempts}`;
}

function renderTimer() {
    gameTimer.textContent = formatTime(timeLeft);
}

function unflipAllCards() {
    const cards = gameCardsContainer.querySelectorAll('.flip-card');
    cards.forEach(card => {
        if (card.classList.contains('flipped')) {
            card.classList.remove('flipped');
        }
    });
}

function shuffleArray(arr) {
    const result = arr.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', initGame);
