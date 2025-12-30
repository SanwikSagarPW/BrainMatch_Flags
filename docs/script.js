// --- DEV FEATURE FLAG ---
// Set to true to enable developer features (e.g., press 'C' to complete a level)
const DEV_MODE = false;

// --- DOM Elements ---
const startScreen = document.querySelector(".start-screen");
const gameContainer = document.querySelector(".game-container");
const winScreen = document.querySelector(".win-screen");

const pauseMenu = document.querySelector('.pause-menu');
const pauseTutorial = document.querySelector('.pause-tutorial');
const pauseButton = document.getElementById('pause-button');
const tutorialButton = document.getElementById('tutorial-button');
const resumeButton = document.getElementById('resume-button');
const exitButton = document.getElementById('exit-button');
const closeTutorialButton = document.getElementById('close-tutorial-button');
const startCampaignButton = document.getElementById("start-campaign-button");

const startReflexButton = document.getElementById("start-reflex-button");
const nextActionButton = document.getElementById("next-action-button");
const cardGrid = document.querySelector(".card-grid");
const levelDisplay = document.getElementById("level-display");
const turnsContainer = document.getElementById("turns-container");
const turnsDisplay = document.getElementById("turns");
const timerContainer = document.getElementById("timer-container");
const timerDisplay = document.getElementById("timer");
const winTitle = document.getElementById("win-title");
const winStatsLabel = document.getElementById("win-stats-label");
const winStatsValue = document.getElementById("win-stats-value");
const winXpContainer = document.getElementById("win-xp-container");
const winXpDisplay = document.getElementById("win-xp");
const winStarsContainer = document.getElementById("win-stars-container");

const finalScoreScreen = document.querySelector(".final-score-screen");
const finalTurnsDisplay = document.getElementById("final-turns-value");
const finalXpDisplay = document.getElementById("final-xp-value");
// const mainMenuButton = document.getElementById('main-menu-button');
const finalStarsContainer = document.getElementById("final-stars-container");
const mainMenuButton = document.getElementById("main-menu-button");

const turnsLabel = document.getElementById("turns-label");

// START: Added Peek Timer element
const peekTimer = document.querySelector(".peek-timer");
// END: Added Peek Timer element

// --- Sound Elements ---
const sounds = {
  correct: document.getElementById("correct-sound"),
  incorrect: document.getElementById("incorrect-sound"),
  flip: document.getElementById("flip-sound"),
  reflex: document.getElementById("reflex-sound"),
  backgroundMusic: document.getElementById("background-music"),
  levelComplete: document.getElementById("level-complete-sound"),
  campaignComplete: document.getElementById("campaign-complete-sound"),
};

// Function to handle background music
function startBackgroundMusic() {
  if (sounds.backgroundMusic) {
    sounds.backgroundMusic.volume = 0.3; // Set volume to 30%
    sounds.backgroundMusic.play().catch((e) => {});
  }
}

function stopBackgroundMusic() {
  if (sounds.backgroundMusic) {
    sounds.backgroundMusic.pause();
    sounds.backgroundMusic.currentTime = 0;
  }
}

// --- Game Content ---
let gameContent = null;

// Load game content from JSON file
async function loadGameContent() {
  try {
    const response = await fetch("gameContent.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    gameContent = await response.json();
    // Enable start button once content is loaded
    startCampaignButton.disabled = false;
  } catch (error) {
    console.error("Error loading game content:", error);
    alert("Error loading game content. Please refresh the page.");
  }
}

// --- Game State ---
let gameState = {};
let totalCampaignTurns = 0;
let totalCampaignXP = 0;

function resetGameState() {
  clearAllTimers();
  gameState = {
    gameMode: null,
    currentCampaignLevel: 1,
    flippedCards: [],
    lockBoard: false,
    turns: 0,
    timeRemaining: 0,
    timerId: null,
    matchedPairs: 0,
    totalPairs: 8,
    isReflexActive: false,
    reflexCard: null,
    reflexTimeoutId: null,
    isPaused: false,
  };
}

// --- Scoring and Feedback ---
function calculateXP(level, turns) {
  switch (level) {
    case 1:
    //   if (turns === 8) return 40;
      if (turns <= 12) return 40;
      if (turns <= 16) return 35;
      return 30;
    case 2:
      if (turns <= 14) return 60;
      if (turns <= 18) return 50;
      return 40;
    case 3:
      if (turns <= 16) return 100;
      if (turns <= 20) return 80;
      return 60;
    default:
      return 0;
  }
}
function calculateCampaignStars(level, turns) {
  const xp = calculateXP(level, turns);
  if (level === 1) {
    if (xp === 40) return 3;
    if (xp === 35) return 2;
    return 1;
  }
  if (level === 2) {
    if (xp === 60) return 3;
    if (xp === 50) return 2;
    return 1;
  }
  if (level === 3) {
    if (xp === 100) return 3;
    if (xp === 80) return 2;
    return 1;
  }
  return 0;
}
function calculateReflexStars(moves) {
  if (moves === 8) return 3;
  if (moves <= 12) return 2;
  return 1;
}

// --- Core Game Logic ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Board Creation with Multiple Content Types Support ---
function createBoard(pairs) {
  cardGrid.innerHTML = "";
  const cardArray = [];

  pairs.forEach((pair) => {
    if (pair.a !== undefined) {
      // Text to Text mode
      if (pair.b !== undefined) {
        cardArray.push({ value: pair.a, match: pair.b, type: "text" });
        cardArray.push({ value: pair.b, match: pair.a, type: "text" });
      }
      // Text to Image mode
      else if (pair.image !== undefined) {
        cardArray.push({ value: pair.a, match: pair.image, type: "text" });
        cardArray.push({
          value: pair.image,
          match: pair.a,
          type: "image",
          alt: pair.imageAlt,
        });
      }
    }
    // Image to Image mode
    else if (pair.firstImage !== undefined) {
      cardArray.push({
        value: pair.firstImage,
        match: pair.secondImage,
        type: "image",
        alt: pair.firstImageAlt,
      });
      cardArray.push({
        value: pair.secondImage,
        match: pair.firstImage,
        type: "image",
        alt: pair.secondImageAlt,
      });
    }
  });

  shuffle(cardArray).forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.value = item.value;
    card.dataset.match = item.match;

    const frontFaceContent =
      item.type === "image"
        ? `<img src="${item.value}" alt="${item.alt || ""}" />`
        : item.value;

    card.innerHTML = `
            <div class="front-face">${frontFaceContent}</div>
            <div class="back-face"></div>
        `;

    card.addEventListener("click", flipCard);
    cardGrid.appendChild(card);
  });
}

function flipCard() {
  if (
    (gameState.lockBoard && !gameState.isReflexActive) ||
    this.classList.contains("flipped") ||
    gameState.isPaused
  )
    return;
  if (gameState.isReflexActive) {
    handleReflexResponse(this);
  } else {
    handleNormalFlip(this);
  }
}

function handleNormalFlip(card) {
  if (sounds.flip) {
    sounds.flip.play().catch((e) => {});
  }
  card.classList.add("flipped");
  gameState.flippedCards.push(card);
  if (gameState.flippedCards.length === 2) {
    gameState.lockBoard = true;
    updateTurns();
    checkForMatch();
  }
}

function checkForMatch() {
  const [first, second] = gameState.flippedCards;
  first.dataset.value === second.dataset.match
    ? handleCorrectMatch()
    : handleIncorrectMatch();
}

function handleCorrectMatch() {
  const [first, second] = gameState.flippedCards;
  first.removeEventListener("click", flipCard);
  second.removeEventListener("click", flipCard);
  first.classList.add("correct");
  second.classList.add("correct");
  if (sounds.correct) {
    sounds.correct.play().catch((e) => {});
  }
  gameState.matchedPairs++;
  resetTurnState();
  if (gameState.matchedPairs === gameState.totalPairs) {
    if (gameState.gameMode === "campaign") handleCampaignWin();
    if (gameState.gameMode === "reflex") handleReflexModeEnd();
  } else if (gameState.gameMode === "reflex") {
    setTimeout(triggerNextReflexChallenge, 500);
  }
}

// Find this function in your script.js
function handleIncorrectMatch() {
  const [first, second] = gameState.flippedCards;
  // Only play sound if the audio element exists
  if (sounds.incorrect) {
    sounds.incorrect.play().catch((e) => {});
  }
  if (navigator.vibrate) navigator.vibrate(200);

  // --- MODIFY THE NEXT TWO SECTIONS ---

  // 1. ADD the 'incorrect' class along with 'shake'
  setTimeout(() => {
    first.classList.add("shake", "incorrect");
    second.classList.add("shake", "incorrect");
  }, 200);

  // 2. REMOVE the 'incorrect' class when the cards flip back
  setTimeout(() => {
    first.classList.remove("flipped", "shake", "incorrect");
    second.classList.remove("flipped", "shake", "incorrect");
    resetTurnState();
    if (gameState.gameMode === "reflex") {
      setTimeout(triggerNextReflexChallenge, 500);
    }
  }, 1200);
}

function resetTurnState() {
  if (gameState.reflexCard)
    gameState.reflexCard.classList.remove("reflex-active");
  gameState.flippedCards = [];
  gameState.lockBoard = false;
  gameState.isReflexActive = false;
  gameState.reflexCard = null;
}

// --- Specific Game Mode Logic ---
function updateTurns() {
  gameState.turns++;
  turnsDisplay.textContent = gameState.turns;
}

function triggerNextReflexChallenge() {
  if (
    gameState.matchedPairs === gameState.totalPairs ||
    gameState.isReflexActive
  )
    return;
  const unmatchedCards = Array.from(
    document.querySelectorAll(".card:not(.correct)")
  );
  if (unmatchedCards.length < 2) return;
  gameState.isReflexActive = true;
  gameState.lockBoard = true;
  sounds.reflex.play().catch((e) => {});
  gameState.reflexCard =
    unmatchedCards[Math.floor(Math.random() * unmatchedCards.length)];
  gameState.reflexCard.classList.add("flipped", "reflex-active");
  gameState.reflexTimeoutId = setTimeout(handleReflexTimeout, 4000);
}

function handleReflexResponse(playerCard) {
  clearTimeout(gameState.reflexTimeoutId);
  if (playerCard === gameState.reflexCard) return;
  updateTurns(); // A player's response counts as a move
  playerCard.classList.add("flipped");
  gameState.flippedCards = [gameState.reflexCard, playerCard];
  checkForMatch();
}

function handleReflexTimeout() {
  if (!gameState.isReflexActive) return;
  updateTurns(); // Timing out also counts as a move
  sounds.incorrect.play().catch((e) => {});
  gameState.reflexCard.classList.remove("flipped", "reflex-active");
  resetTurnState();
  setTimeout(triggerNextReflexChallenge, 500);
}

// --- Game Flow & Screen Management ---
// START: Replaced peekAtStart with advanced version
function peekAtStart(duration, callback) {
    gameState.lockBoard = true;
    const cards = document.querySelectorAll(".card");
    const blocks = document.querySelectorAll('.timer-block');
    const flipOpenDelay = 100;
    const flipAnimationTime = 600;

    let timeLeft = duration / 1000;

    // Set initial state
    peekTimer.classList.remove('hidden');

    const timerInterval = setInterval(() => {
        // Find the correct block to hide.
        const blockToHide = blocks[timeLeft - 1];
        if (blockToHide) {
            blockToHide.classList.add('inactive');
        }

        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Card flipping timeouts
    setTimeout(() => {
        cards.forEach((card) => card.classList.add("flipped"));
    }, flipOpenDelay);

    setTimeout(() => {
        cards.forEach((card) => card.classList.remove("flipped"));
    }, duration + flipOpenDelay);

    setTimeout(() => {
        gameState.lockBoard = false;
        peekTimer.classList.add('hidden');
        // Reset blocks for the next round
        blocks.forEach(block => block.classList.remove('inactive'));
        if (callback) {
            callback();
        }
    }, duration + flipOpenDelay + flipAnimationTime);
}

function createPeekTimerBlocks(seconds) {
    const container = document.querySelector('.timer-blocks-container');
    container.innerHTML = ''; // Clear previous blocks
    for (let i = 0; i < seconds; i++) {
        const block = document.createElement('div');
        block.classList.add('timer-block');
        container.appendChild(block);
    }
}
// END: Replaced peekAtStart

function startGame(level) {
  if (!gameContent) {
    alert("Game content not loaded. Please refresh the page.");
    return;
  }
  if (level === 1) {
    totalCampaignTurns = 0;
    totalCampaignXP = 0;
  }
  resetGameState();
  startBackgroundMusic();
  gameState.gameMode = "campaign";
  gameState.currentCampaignLevel = level;
  const levelData = gameContent.content.science[`level${level}`];
  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  levelDisplay.textContent = `LEVEL ${level}`;
  turnsDisplay.textContent = "0";
  timerContainer.classList.toggle("hidden", !levelData.timer);
  turnsLabel.textContent = "TURNS";
  createBoard(levelData.pairs);

  // START: Updated to use new peek timer logic
  const peekDurationSeconds = 5; 
  createPeekTimerBlocks(peekDurationSeconds); 
  peekAtStart(peekDurationSeconds * 1000, () => { 
      if (levelData.timer) startTimer(levelData.timer);
  });
  // END: Updated to use new peek timer logic
}

function startReflexMode() {
  resetGameState();
  gameState.gameMode = "reflex";
  const allPairs = [
    ...gameContent.content.science.level1.pairs,
    ...gameContent.content.science.level2.pairs,
    ...gameContent.content.science.level3.pairs,
  ];
  const reflexPairs = shuffle(allPairs).slice(0, 8);
  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  levelDisplay.textContent = "REFLEX MODE";
  turnsDisplay.textContent = "0";
  timerContainer.classList.add("hidden");
  turnsLabel.textContent = "MOVES";
  createBoard(reflexPairs);

  // START: Updated to use new peek timer logic
  const peekDurationSeconds = 2;
  createPeekTimerBlocks(peekDurationSeconds);
  peekAtStart(peekDurationSeconds * 1000, () => {
      setTimeout(triggerNextReflexChallenge, 1000);
  });
  // END: Updated to use new peek timer logic
}

function handleCampaignWin() {
  clearAllTimers();
  const level = gameState.currentCampaignLevel;
  console.log(`handleCampaignWin called for level: ${level}`);
  const xp = calculateXP(level, gameState.turns);
  const stars = calculateCampaignStars(level, gameState.turns);
  totalCampaignTurns += gameState.turns;
  totalCampaignXP += xp;
  setTimeout(() => {
    // START: Added confetti
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    }
    // END: Added confetti

    gameContainer.classList.add("hidden");
    winScreen.classList.remove("hidden");
    winStarsContainer.classList.remove("hidden");
    winXpContainer.classList.remove("hidden");
    console.log(`Playing sound for level: ${level}`);
    winTitle.textContent =
      level < 3 ? `LEVEL ${level} COMPLETE!` : "GAME COMPLETE!";
    winStatsLabel.textContent = "TURNS";
    winStatsValue.textContent = gameState.turns;
    winXpDisplay.textContent = xp;
    const starElements = winStarsContainer.querySelectorAll(".star");
    starElements.forEach((star, index) =>
      star.classList.toggle("filled", index < stars)
    );

    // Play appropriate completion sound
    if (level === 3) {
      if (sounds.campaignComplete) {
        sounds.campaignComplete.play().catch((e) => {});
      }
    } else {
      if (sounds.levelComplete) {
        sounds.levelComplete.play().catch((e) => {});
      }
    }

    if (level < 3) {
      nextActionButton.textContent = "Next Level";
      nextActionButton.onclick = () => startGame(level + 1);
    } else {
      nextActionButton.textContent = "See Final Score"; // Change button text
      nextActionButton.onclick = showFinalScoreScreen; // Change button action
    }
  }, 800);
}

function calculateFinalStars(totalXP) {
  if (totalXP >= 150) {
    return 3; // 3 stars for scores 150 and above
  } else if (totalXP >= 70) {
    return 2; // 2 stars for scores between 70 and 149
  } else {
    return 1; // 1 star for scores below 70
  }
}

function showFinalScoreScreen() {
  winScreen.classList.add("hidden"); // Hide the level 3 win screen

  const stars = calculateFinalStars(totalCampaignXP);
  const starElements = finalStarsContainer.querySelectorAll(".star");
  starElements.forEach((star, index) => {
    star.classList.toggle("filled", index < stars);
  });

  // Update the values on the final screen
  finalTurnsDisplay.textContent = totalCampaignTurns;
  finalXpDisplay.textContent = totalCampaignXP;

  finalScoreScreen.classList.remove("hidden"); // Show the final score screen
}

function handleReflexModeEnd() {
  clearAllTimers();
  const stars = calculateReflexStars(gameState.turns);
  setTimeout(() => {
    // START: Added confetti
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    }
    // END: Added confetti
    
    gameContainer.classList.add("hidden");
    winScreen.classList.remove("hidden");
    winTitle.textContent = "REFLEX COMPLETE!";
    winStatsLabel.textContent = "TOTAL MOVES";
    winStatsValue.textContent = gameState.turns;
    winXpContainer.classList.add("hidden");
    winStarsContainer.classList.remove("hidden");
    const starElements = winStarsContainer.querySelectorAll(".star");
    starElements.forEach((star, index) =>
      star.classList.toggle("filled", index < stars)
    );
    nextActionButton.textContent = "Main Menu";
    nextActionButton.onclick = showStartScreen;
  }, 500);
}

function startTimer(duration) {
  timerContainer.classList.remove("hidden");
  gameState.timeRemaining = duration;
  timerDisplay.textContent = duration;
  gameState.timerId = setInterval(() => {
    if (gameState.isPaused) return;
    gameState.timeRemaining--;
    timerDisplay.textContent = gameState.timeRemaining;
    if (gameState.timeRemaining <= 0) {
      clearAllTimers();
      alert("Time's Up! Try again.");
      showStartScreen();
    }
  }, 1000);
}

function showStartScreen() {
  winScreen.classList.add("hidden");
  gameContainer.classList.add("hidden");
  finalScoreScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  stopBackgroundMusic();
}

function clearAllTimers() {
  clearTimeout(gameState.reflexTimeoutId);
  clearInterval(gameState.timerId);
}

// --- How to Play Tutorial ---
function showHowToPlay() {
  const howToPlay = document.querySelector(".how-to-play");
  const startGameButton = document.getElementById("start-game-button");
  const tutorialCards = document.querySelectorAll(".tutorial-card");

  // Get first pair from level 1 for the tutorial
  const tutorialPair = gameContent.content.science.level1.pairs[0];
  const card1Front = document.querySelector("#tutorial-card-1 .tutorial-front");
  const card2Front = document.querySelector("#tutorial-card-2 .tutorial-front");

  // Set up the cards based on the game mode
  if (gameContent.gameMode === "textToText") {
    card1Front.textContent = tutorialPair.a;
    card2Front.textContent = tutorialPair.b;
  } else if (gameContent.gameMode === "textToImage") {
    card1Front.textContent = tutorialPair.a;
    card2Front.innerHTML = `<img src="${tutorialPair.image}" alt="${tutorialPair.imageAlt}">`;
  } else if (gameContent.gameMode === "imageToImage") {
    card1Front.innerHTML = `<img src="${tutorialPair.firstImage}" alt="${tutorialPair.firstImageAlt}">`;
    card2Front.innerHTML = `<img src="${tutorialPair.secondImage}" alt="${tutorialPair.secondImageAlt}">`;
  }

  howToPlay.classList.remove("hidden");

  // Demonstrate card flipping
  let flipIndex = 0;
  function flipNextCard() {
    if (flipIndex < tutorialCards.length) {
      tutorialCards[flipIndex].classList.add("flipped");

      // Add correct class after second card is flipped
      if (flipIndex === 1) {
        setTimeout(() => {
          tutorialCards.forEach((card) => {
            card.classList.add("correct");
          });
        }, 600);
      }

      flipIndex++;
      setTimeout(flipNextCard, 1500);
    } else {
      setTimeout(() => {
        tutorialCards.forEach((card) => {
          card.classList.remove("flipped", "correct");
        });
        flipIndex = 0;
        setTimeout(flipNextCard, 2000);
      }, 1000);
    }
  }

  flipNextCard();

  // Start game when "Got it!" is clicked
  startGameButton.onclick = () => {
    howToPlay.classList.add("hidden");
    startGame(1);
  };
}

// --- Pause Menu Functions ---
function showPauseMenu() {
    gameState.isPaused = true;
    gameState.lockBoard = true;
    pauseMenu.classList.remove('hidden');
}

function hidePauseMenu() {
  gameState.isPaused = false;
  gameState.lockBoard = false;
  pauseMenu.classList.add("hidden");
}

function showPauseTutorial() {
    pauseTutorial.classList.remove('hidden');
    
    // Set up tutorial cards
    const tutorialPair = gameContent.content.science.level1.pairs[0];
    const card1Front = document.querySelector('#pause-tutorial-card-1 .tutorial-front');
    const card2Front = document.querySelector('#pause-tutorial-card-2 .tutorial-front');

    if (gameContent.gameMode === 'textToText') {
        card1Front.textContent = tutorialPair.a;
        card2Front.textContent = tutorialPair.b;
    } else if (gameContent.gameMode === 'textToImage') {
        card1Front.textContent = tutorialPair.a;
        card2Front.innerHTML = `<img src="${tutorialPair.image}" alt="${tutorialPair.imageAlt}">`;
    } else if (gameContent.gameMode === 'imageToImage') {
        card1Front.innerHTML = `<img src="${tutorialPair.firstImage}" alt="${tutorialPair.firstImageAlt}">`;
        card2Front.innerHTML = `<img src="${tutorialPair.secondImage}" alt="${tutorialPair.secondImageAlt}">`;
    }

    // Start tutorial animation
    const tutorialCards = document.querySelectorAll('.pause-tutorial-card');
    let flipIndex = 0;
    
    function flipNextCard() {
        if (flipIndex < tutorialCards.length) {
            tutorialCards[flipIndex].classList.add('flipped');
            
            if (flipIndex === 1) {
                setTimeout(() => {
                    tutorialCards.forEach(card => {
                        card.classList.add('correct');
                    });
                }, 600);
            }
            
            flipIndex++;
            setTimeout(flipNextCard, 1500);
        } else {
            setTimeout(() => {
                tutorialCards.forEach(card => {
                    card.classList.remove('flipped', 'correct');
                });
                flipIndex = 0;
                if (!pauseTutorial.classList.contains('hidden')) {
                    setTimeout(flipNextCard, 2000);
                }
            }, 1000);
        }
    }

    flipNextCard();
}

function hidePauseTutorial() {
    pauseTutorial.classList.add('hidden');
}

// --- Initial Event Listeners ---
// Disable start button until content is loaded
startCampaignButton.disabled = true;

// Load game content when page loads
document.addEventListener("DOMContentLoaded", loadGameContent);

startCampaignButton.addEventListener("click", showHowToPlay);
startReflexButton.addEventListener("click", startReflexMode);

mainMenuButton.addEventListener("click", showStartScreen);

// --- [NEW] DEV FEATURE: AUTO-COMPLETE LEVEL ---
window.addEventListener("keydown", (e) => {
  // Check if DEV_MODE is on, the 'c' key was pressed, and the main game screen is active
  if (
    DEV_MODE &&
    e.key.toLowerCase() === "c" &&
    !gameContainer.classList.contains("hidden")
  ) {
    // Ensure it only works for the campaign mode
    if (gameState.gameMode === "campaign") {
      console.log("DEV: Auto-completing campaign level...");
      handleCampaignWin();
    }
  }
});

// Pause button event listeners
pauseButton.addEventListener('click', showPauseMenu);
tutorialButton.addEventListener('click', showPauseTutorial);
closeTutorialButton.addEventListener('click', hidePauseTutorial);
resumeButton.addEventListener('click', hidePauseMenu);
exitButton.addEventListener('click', () => {
    hidePauseMenu();
    showStartScreen();
});