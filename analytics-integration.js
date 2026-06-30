// =====================================================
// Analytics Integration for BrainMatch Game
// =====================================================
// This file hooks into game functions without modifying
// the original game code (script.js)
// =====================================================

(function() {
    'use strict';

    console.log('[Analytics] Integration script loading...');

    // =====================================================
    // 1. INITIALIZATION
    // =====================================================
    const sessionID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analytics = new AnalyticsManager();
    
    try {
        analytics.initialize('BrainMatch_Flags', sessionID);
        console.log('[Analytics] Initialized with Session ID:', sessionID);
    } catch (error) {
        console.error('[Analytics] Failed to initialize:', error);
        return; // Exit if initialization fails
    }

    // =====================================================
    // 2. TRACKING VARIABLES
    // =====================================================
    let levelStartTime = null;
    let currentLevelId = null;
    let taskCounter = 0;
    let currentGameMode = null;

    // =====================================================
    // 3. HELPER FUNCTIONS
    // =====================================================

    function getCurrentLevelId() {
        if (currentGameMode === 'campaign' && gameState && gameState.currentCampaignLevel) {
            return `campaign_level_${gameState.currentCampaignLevel}`;
        } else if (currentGameMode === 'reflex') {
            return 'reflex_mode';
        }
        return 'unknown_level';
    }

    function safeGetGameState(property, defaultValue = 0) {
        try {
            return gameState && gameState[property] !== undefined 
                ? gameState[property] 
                : defaultValue;
        } catch (error) {
            console.error(`[Analytics] Error accessing gameState.${property}:`, error);
            return defaultValue;
        }
    }

    // =====================================================
    // 4. HOOK: CAMPAIGN MODE START
    // =====================================================
    const originalStartGame = window.startGame;
    if (typeof originalStartGame === 'function') {
        window.startGame = function(level) {
            try {
                currentGameMode = 'campaign';
                currentLevelId = `campaign_level_${level}`;
                levelStartTime = Date.now();
                taskCounter = 0;

                analytics.startLevel(currentLevelId);
                console.log(`[Analytics] Started Level: ${currentLevelId}`);
            } catch (error) {
                console.error('[Analytics] Error in startGame hook:', error);
            }

            // Always call original function
            return originalStartGame.call(this, level);
        };
        console.log('[Analytics] Hooked into startGame()');
    }

    // =====================================================
    // 5. HOOK: REFLEX MODE START
    // =====================================================
    const originalStartReflexMode = window.startReflexMode;
    if (typeof originalStartReflexMode === 'function') {
        window.startReflexMode = function() {
            try {
                currentGameMode = 'reflex';
                currentLevelId = 'reflex_mode';
                levelStartTime = Date.now();
                taskCounter = 0;

                analytics.startLevel(currentLevelId);
                console.log('[Analytics] Started Reflex Mode');
            } catch (error) {
                console.error('[Analytics] Error in startReflexMode hook:', error);
            }

            // Always call original function
            return originalStartReflexMode.call(this);
        };
        console.log('[Analytics] Hooked into startReflexMode()');
    }

    // =====================================================
    // 6. HOOK: CORRECT MATCH (Task Recording)
    // =====================================================
    const originalHandleCorrectMatch = window.handleCorrectMatch;
    if (typeof originalHandleCorrectMatch === 'function') {
        window.handleCorrectMatch = function() {
            try {
                // Capture state BEFORE calling original function
                const flippedCards = gameState?.flippedCards || [];
                if (flippedCards.length === 2) {
                    const [first, second] = flippedCards;
                    const question = first.dataset?.value || 'Unknown';
                    const correctAnswer = first.dataset?.match || 'Unknown';
                    const userAnswer = second.dataset?.value || 'Unknown';

                    taskCounter++;
                    const taskId = `task_${taskCounter}`;

                    analytics.recordTask(
                        getCurrentLevelId(),
                        taskId,
                        `Match: ${question}`,
                        correctAnswer,
                        userAnswer,
                        0, // timeTaken (not tracked per task)
                        0  // xpEarned (calculated at level end)
                    );

                    console.log(`[Analytics] Task Recorded - Correct Match: ${question} ↔ ${userAnswer}`);
                }
            } catch (error) {
                console.error('[Analytics] Error in handleCorrectMatch hook:', error);
            }

            // Always call original function
            return originalHandleCorrectMatch.call(this);
        };
        console.log('[Analytics] Hooked into handleCorrectMatch()');
    }

    // =====================================================
    // 7. HOOK: INCORRECT MATCH (Task Recording)
    // =====================================================
    const originalHandleIncorrectMatch = window.handleIncorrectMatch;
    if (typeof originalHandleIncorrectMatch === 'function') {
        window.handleIncorrectMatch = function() {
            try {
                // Capture state BEFORE calling original function
                const flippedCards = gameState?.flippedCards || [];
                if (flippedCards.length === 2) {
                    const [first, second] = flippedCards;
                    const question = first.dataset?.value || 'Unknown';
                    const correctAnswer = first.dataset?.match || 'Unknown';
                    const userAnswer = second.dataset?.value || 'Unknown';

                    taskCounter++;
                    const taskId = `task_${taskCounter}`;

                    analytics.recordTask(
                        getCurrentLevelId(),
                        taskId,
                        `Match: ${question}`,
                        correctAnswer,
                        userAnswer,
                        0, // timeTaken
                        0  // xpEarned
                    );

                    console.log(`[Analytics] Task Recorded - Incorrect Match: ${question}, Expected: ${correctAnswer}, Got: ${userAnswer}`);
                }
            } catch (error) {
                console.error('[Analytics] Error in handleIncorrectMatch hook:', error);
            }

            // Always call original function
            return originalHandleIncorrectMatch.call(this);
        };
        console.log('[Analytics] Hooked into handleIncorrectMatch()');
    }

    // =====================================================
    // 8. HOOK: CAMPAIGN WIN (Level Completion)
    // =====================================================
    const originalHandleCampaignWin = window.handleCampaignWin;
    if (typeof originalHandleCampaignWin === 'function') {
        window.handleCampaignWin = function() {
            try {
                // Capture state BEFORE calling original function
                const level = safeGetGameState('currentCampaignLevel', 0);
                const turns = safeGetGameState('turns', 0);
                const timeTaken = levelStartTime ? (Date.now() - levelStartTime) : 0;
                
                // Calculate XP using the game's own function
                let xpEarned = 0;
                if (typeof window.calculateXP === 'function') {
                    xpEarned = window.calculateXP(level, turns);
                } else {
                    // Fallback calculation if function not found
                    if (turns <= 10) xpEarned = 100;
                    else if (turns <= 15) xpEarned = 75;
                    else xpEarned = 50;
                }

                const levelId = `campaign_level_${level}`;

                // Record level completion
                analytics.endLevel(levelId, true, timeTaken, xpEarned);

                // Add additional metrics
                analytics.addRawMetric('level', level.toString());
                analytics.addRawMetric('turns', turns.toString());
                analytics.addRawMetric('xp_earned', xpEarned.toString());
                analytics.addRawMetric('game_mode', 'campaign');

                // Do NOT submit here — wait for all 3 levels to finish on the final score screen
                console.log(`[Analytics] Completed Level: ${levelId}, Success: true, Time: ${timeTaken}ms, XP: ${xpEarned}`);
            } catch (error) {
                console.error('[Analytics] Error in handleCampaignWin hook:', error);
            }

            // Always call original function
            return originalHandleCampaignWin.call(this);
        };
        console.log('[Analytics] Hooked into handleCampaignWin()');
    }

    // =====================================================
    // 9. HOOK: REFLEX MODE END (Level Completion)
    // =====================================================
    const originalHandleReflexModeEnd = window.handleReflexModeEnd;
    if (typeof originalHandleReflexModeEnd === 'function') {
        window.handleReflexModeEnd = function() {
            try {
                // Capture state BEFORE calling original function
                const turns = safeGetGameState('turns', 0);
                const timeTaken = levelStartTime ? (Date.now() - levelStartTime) : 0;
                
                // Reflex mode doesn't have XP
                const xpEarned = 0;

                // Record level completion
                analytics.endLevel('reflex_mode', true, timeTaken, xpEarned);

                // Add additional metrics
                analytics.addRawMetric('total_moves', turns.toString());
                analytics.addRawMetric('game_mode', 'reflex');

                // Calculate and add stars
                if (typeof window.calculateReflexStars === 'function') {
                    const stars = window.calculateReflexStars(turns);
                    analytics.addRawMetric('stars', stars.toString());
                }

                // Reflex is standalone — submit immediately
                analytics.submitReport();
                console.log(`[Analytics] Completed Reflex Mode, Success: true, Time: ${timeTaken}ms, Moves: ${turns}`);
            } catch (error) {
                console.error('[Analytics] Error in handleReflexModeEnd hook:', error);
            }

            // Always call original function
            return originalHandleReflexModeEnd.call(this);
        };
        console.log('[Analytics] Hooked into handleReflexModeEnd()');
    }

    // =====================================================
    // 10. HOOK: TIMER FAILURE (Level Failed)
    // =====================================================
    const originalStartTimer = window.startTimer;
    if (typeof originalStartTimer === 'function') {
        window.startTimer = function(duration) {
            // Call original function first to set up the timer
            const result = originalStartTimer.call(this, duration);

            // Wrap the timer interval to detect failures
            try {
                const originalInterval = gameState?.timerId;
                if (originalInterval) {
                    // Store original clearInterval
                    const originalClearInterval = window.clearInterval;
                    
                    // Monitor when timer reaches zero
                    const checkInterval = setInterval(() => {
                        try {
                            const timeRemaining = safeGetGameState('timeRemaining', -1);
                            if (timeRemaining === 0) {
                                // Timer expired - level failed
                                const timeTaken = levelStartTime ? (Date.now() - levelStartTime) : 0;
                                const turns = safeGetGameState('turns', 0);
                                
                                analytics.endLevel(getCurrentLevelId(), false, timeTaken, 0);
                                analytics.addRawMetric('failure_reason', 'timeout');
                                analytics.addRawMetric('turns', turns.toString());
                                const earnedSoFar = analytics._reportData.xpEarnedTotal || 0;
                                analytics.addRawMetric('total_xp_at_failure', earnedSoFar.toString());
                                analytics.submitReport();

                                console.log(`[Analytics] Level Failed: ${getCurrentLevelId()}, Reason: Timeout, XP so far: ${earnedSoFar}`);
                                
                                clearInterval(checkInterval);
                            }
                        } catch (error) {
                            console.error('[Analytics] Error checking timer:', error);
                        }
                    }, 500);
                }
            } catch (error) {
                console.error('[Analytics] Error hooking timer:', error);
            }

            return result;
        };
        console.log('[Analytics] Hooked into startTimer()');
    }

    // =====================================================
    // 11. FINAL SCORE SCREEN — single submit with full campaign XP
    // =====================================================
    const originalShowFinalScoreScreen = window.showFinalScoreScreen;
    if (typeof originalShowFinalScoreScreen === 'function') {
        window.showFinalScoreScreen = function() {
            try {
                const totalXP = analytics._reportData.xpEarnedTotal || 0;

                let finalStars = 1;
                if (totalXP >= 150) finalStars = 3;
                else if (totalXP >= 70) finalStars = 2;

                analytics.addRawMetric('campaign_complete', 'true');
                analytics.addRawMetric('total_campaign_xp', totalXP.toString());
                analytics.addRawMetric('final_stars', finalStars.toString());

                // Single report for the entire 3-level campaign
                analytics.submitReport();
                console.log(`[Analytics] Campaign complete — final report submitted. Total XP: ${totalXP}, Stars: ${finalStars}`);
            } catch (error) {
                console.error('[Analytics] Error in showFinalScoreScreen hook:', error);
            }

            return originalShowFinalScoreScreen.call(this);
        };
        console.log('[Analytics] Hooked into showFinalScoreScreen()');
    }

    // =====================================================
    // 12. INITIALIZATION COMPLETE
    // =====================================================
    console.log('[Analytics] Integration complete - All hooks installed');

})();
