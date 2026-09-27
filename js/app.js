document.addEventListener('DOMContentLoaded', async () => {
  // Ensure card data is loaded
  await cardManager.loadData();

  // DOM Elements
  const setupForm = document.getElementById('setup-form');
  const actionModal = document.getElementById('action-modal');
  const actionModalBody = document.getElementById('action-modal-body');
  const rollBtn = document.getElementById('roll-btn');
  const diceDisplay = document.getElementById('dice-result');
  const playerTurnIndicator = document.getElementById('player-turn-indicator');
  const heatBalanceDisplay = document.getElementById('heat-balance');

  // Setup Form Handler
  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const p1Input = document.getElementById('p1-name');
    const p2Input = document.getElementById('p2-name');

    const config = {
      p1Name: p1Input && p1Input.value.trim() ? p1Input.value.trim() : 'Player 1',
      p2Name: p2Input && p2Input.value.trim() ? p2Input.value.trim() : 'Player 2',
      gameMode: document.querySelector('input[name="gameMode"]:checked')?.value || 'short',
      outerSpice: document.querySelector('input[name="outerSpice"]:checked')?.value || 'romantic',
      innerSpice: document.querySelector('input[name="innerSpice"]:checked')?.value || 'tease'
    };

    window.gameEngine.init(config);

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    updateUI();
  });

  // Roll Dice
  rollBtn.addEventListener('click', () => {
    if (window.gameEngine.gameState.isGameOver) return;

    const roll = window.gameEngine.rollDie();
    diceDisplay.textContent = roll;

    const activePlayer = window.gameEngine.getActivePlayer();
    
    showModal(`
      <h2>🎲 Roll Result</h2>
      <p style="font-size: 2.5rem; font-weight: bold; color: var(--accent-inner, #e74c3c); margin: 16px 0;">
        ${activePlayer.name} rolled a ${roll}!
      </p>
      <button id="move-player-btn" class="btn-primary" style="width: 100%;">Move Token</button>
    `);

    document.getElementById('move-player-btn').onclick = () => {
      hideModal();
      const moveResult = window.gameEngine.movePlayer(roll);
      updateBoardTokens();

      if (moveResult.hitJunction) {
        showJunctionModal();
      } else {
        const posNum = String(moveResult.newPosition).replace('tile_', '');
        handleTileInteraction(`tile_${posNum}`);
      }
    };
  });

  function updateBoardTokens() {
    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('p1-here', 'p2-here', 'owned-p1', 'owned-p2');
    });

    Object.entries(window.gameEngine.gameState.tileOwnership).forEach(([tileId, ownerId]) => {
      const el = document.querySelector(`[data-tile-id="${tileId}"]`);
      if (el) el.classList.add(`owned-p${ownerId}`);
    });

    const p1 = window.gameEngine.gameState.players[1];
    const p2 = window.gameEngine.gameState.players[2];

    const p1El = document.querySelector(`[data-tile-id="tile_${p1.position}"]`) || document.querySelector(`[data-tile-id="${p1.position}"]`);
    const p2El = document.querySelector(`[data-tile-id="tile_${p2.position}"]`) || document.querySelector(`[data-tile-id="${p2.position}"]`);

    if (p1El) p1El.classList.add('p1-here');
    if (p2El) p2El.classList.add('p2-here');
  }

  function startModalTimer(durationInSeconds) {
    const timerBtn = document.getElementById('timer-btn');
    if (!timerBtn) return;

    let timeLeft = durationInSeconds;
    timerBtn.disabled = true;
    timerBtn.style.opacity = '0.9';

    const countdown = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(countdown);
        timerBtn.textContent = '⏰ Time Up!';
        timerBtn.style.backgroundColor = '#2ecc71';
        timerBtn.disabled = false;
      } else {
        timerBtn.textContent = `⏳ ${timeLeft}s Remaining...`;
        timeLeft--;
      }
    }, 1000);
  }

  // TILE INTERACTION
  function handleTileInteraction(tileId) {
    const activePlayer = window.gameEngine.getActivePlayer();
    const ownerId = window.gameEngine.gameState.tileOwnership[tileId];
    
    const spiceSetting = activePlayer.currentRing === 'outer' 
      ? window.gameEngine.gameState.outerSpice 
      : window.gameEngine.gameState.innerSpice;
      
    const challengeData = cardManager.getChallengeForTile(tileId, spiceSetting);

    const rawNum = String(tileId).replace('tile_', '');
    const tileElement = document.querySelector(`[data-tile-id="tile_${rawNum}"]`) || 
                        document.querySelector(`[data-tile-id="${rawNum}"]`);
                        
    let domName = null;
    if (tileElement) {
      const spanEl = tileElement.querySelector('span');
      domName = spanEl ? spanEl.textContent.trim() : tileElement.textContent.trim();
    }

    const zoneName = challengeData?.tile_name || domName || `Zone ${rawNum}`;
    const rentTask = challengeData?.rent_task || 'Perform 30 seconds of gentle touch.';
    const takeoverChallenge = challengeData?.takeover_challenge || 'Perform a 60-second intimate massage.';

    // 1. UNCLAIMED TILE
    if (!ownerId) {
      showModal(`
        <h2>Unclaimed Territory: ${zoneName}</h2>
        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin: 12px 0;">
          <p style="margin: 0; color: #45a29e; font-weight: bold; font-size: 0.9rem;">TASK TO CLAIM:</p>
          <p style="margin: 6px 0 0 0; font-size: 1.05rem;">${rentTask}</p>
        </div>
        
        <button id="timer-btn" class="btn-primary" style="width:100%; margin-bottom: 12px; background: #e74c3c;">
          ⏱️ Start 30s Timer
        </button>
        
        <button id="draw-card-btn" class="btn-primary" style="width:100%; margin-bottom: 8px;">Draw Modifier Card & Claim</button>
        <button id="bank-heat-btn" class="btn-primary" style="width:100%;">+1 Heat & Claim</button>
      `);

      const timerBtn = document.getElementById('timer-btn');
      if (timerBtn) timerBtn.onclick = () => startModalTimer(30);

      const drawCardBtn = document.getElementById('draw-card-btn');
      if (drawCardBtn) {
        drawCardBtn.onclick = () => {
          let modCard = null;
          try {
            modCard = cardManager.drawRandomModifier();
          } catch (err) {
            console.error('Error drawing modifier card:', err);
          }
          
          const modName = modCard?.name || 'Modifier Card';
          const modDesc = modCard?.description || 'Perform the current task with an added twist!';

          showModal(`
            <div style="border: 2px solid #f39c12; border-radius: 12px; padding: 16px; background: rgba(243, 156, 18, 0.1); margin-bottom: 16px;">
              <span style="font-size: 0.85rem; text-transform: uppercase; color: #f39c12; font-weight: bold;">✨ Modifier Card</span>
              <h2 style="color: #f1c40f; margin: 8px 0;">${modName}</h2>
              <p style="font-size: 1.05rem; line-height: 1.4; color: #edf5e1;">${modDesc}</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0; color: #45a29e; font-weight: bold; font-size: 0.9rem;">BASE TASK:</p>
              <p style="margin: 4px 0 0 0;">${rentTask}</p>
            </div>
            <button id="confirm-mod-btn" class="btn-primary" style="width: 100%;">Complete Task & Claim Zone</button>
          `);

          const confirmModBtn = document.getElementById('confirm-mod-btn');
          if (confirmModBtn) {
            confirmModBtn.onclick = () => {
              window.gameEngine.claimTile(tileId, activePlayer.id);
              completeTurn();
            };
          }
        };
      }

      const bankHeatBtn = document.getElementById('bank-heat-btn');
      if (bankHeatBtn) {
        bankHeatBtn.onclick = () => {
          window.gameEngine.addHeat(activePlayer.id, 1);
          window.gameEngine.claimTile(tileId, activePlayer.id);
          completeTurn();
        };
      }

    // 2. OWNED BY SELF
    } else if (ownerId === activePlayer.id) {
      showModal(`
        <h2>Your Territory: ${zoneName}</h2>
        <p style="margin: 16px 0;">You land safely in your own zone!</p>
        <button id="close-modal-btn" class="btn-primary" style="width:100%;">Continue Turn</button>
      `);
      
      const closeModalBtn = document.getElementById('close-modal-btn');
      if (closeModalBtn) closeModalBtn.onclick = completeTurn;

    // 3. OWNED BY OPPONENT (RENT / TAKEOVER)
    } else {
      const opponent = window.gameEngine.getOpponentPlayer();
      const currentOwnerId = ownerId; // Guard the ownerId reference locally

      showModal(`
        <h2>Territory of ${opponent.name}: ${zoneName}</h2>
        
        <div style="background: rgba(231, 76, 60, 0.15); border: 1px solid #e74c3c; padding: 12px; border-radius: 8px; margin: 12px 0; text-align: left;">
          <p style="margin: 0; color: #e74c3c; font-weight: bold; font-size: 0.85rem; text-transform: uppercase;">Rent Task Requirement:</p>
          <p style="margin: 6px 0 0 0; font-size: 1.1rem; line-height: 1.4; color: #edf5e1;">${rentTask}</p>
        </div>

        <button id="timer-btn" class="btn-primary" style="width:100%; margin-bottom: 12px; background: #e74c3c;">
          ⏱️ Start 30s Timer
        </button>

        <button id="pay-rent-btn" class="btn-primary" style="width:100%; margin-bottom: 8px;">
          Perform Rent Task (${opponent.name} gets +1 Heat)
        </button>
        
        <button id="takeover-btn" class="btn-primary" style="width:100%; background: #9b59b6;">
          Attempt Takeover Challenge
        </button>
      `);

      const timerBtn = document.getElementById('timer-btn');
      if (timerBtn) timerBtn.onclick = () => startModalTimer(30);

      const payRentBtn = document.getElementById('pay-rent-btn');
      if (payRentBtn) {
        payRentBtn.onclick = () => {
          window.gameEngine.addHeat(currentOwnerId, 1);
          completeTurn();
        };
      }

      const takeoverBtn = document.getElementById('takeover-btn');
      if (takeoverBtn) {
        takeoverBtn.onclick = () => {
          showModal(`
            <h2>🔥 Takeover Challenge: ${zoneName}</h2>
            <div style="background: rgba(155, 89, 182, 0.2); border: 1px solid #9b59b6; padding: 14px; border-radius: 8px; margin: 16px 0; text-align: left;">
              <p style="margin: 0; color: #9b59b6; font-weight: bold; font-size: 0.85rem; text-transform: uppercase;">Challenge Required:</p>
              <p style="margin: 6px 0 0 0; font-size: 1.1rem; line-height: 1.4; color: #edf5e1;">${takeoverChallenge}</p>
            </div>
            <button id="confirm-takeover-btn" class="btn-primary" style="width: 100%;">Complete & Take Control</button>
          `);

          const confirmTakeoverBtn = document.getElementById('confirm-takeover-btn');
          if (confirmTakeoverBtn) {
            confirmTakeoverBtn.onclick = () => {
              window.gameEngine.transferTile(tileId, activePlayer.id);
              completeTurn();
            };
          }
        };
      }
    }
  }

  function showJunctionModal() {
    const activePlayer = window.gameEngine.getActivePlayer();
    showModal(`
      <h2>⚡ Gateway Junction ⚡</h2>
      <p style="margin: 12px 0;">Ascend to the Inner Ring?</p>
      <button id="enter-inner-btn" class="btn-primary" style="width:100%; margin-bottom: 8px;">Enter Inner Ring</button>
      <button id="stay-outer-btn" class="btn-primary" style="width:100%;">Remain in Outer Ring</button>
    `);

    const enterInnerBtn = document.getElementById('enter-inner-btn');
    if (enterInnerBtn) {
      enterInnerBtn.onclick = () => {
        window.gameEngine.enterInnerRing();
        updateBoardTokens();
        handleTileInteraction(`tile_${activePlayer.position}`);
      };
    }

    const stayOuterBtn = document.getElementById('stay-outer-btn');
    if (stayOuterBtn) {
      stayOuterBtn.onclick = () => {
        handleTileInteraction('tile_5');
      };
    }
  }

  function completeTurn() {
    hideModal();
    window.gameEngine.checkWinCondition();

    if (window.gameEngine.gameState.isGameOver) {
      const winner = window.gameEngine.getActivePlayer();
      showModal(`
        <h2>🎉 ${winner.name} Wins! 🎉</h2>
        <p>Full territory dominion achieved.</p>
        <button id="restart-btn" class="btn-primary" style="width:100%; margin-top: 12px;">Play Again</button>
      `);
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) restartBtn.onclick = () => location.reload();
    } else {
      window.gameEngine.switchTurn();
      showHandoverModal();
    }
  }

  function showHandoverModal() {
    const nextPlayer = window.gameEngine.getActivePlayer();
    showModal(`
      <span class="handover-icon" style="font-size: 2rem;">📱</span>
      <h2>Hand Over Phone</h2>
      <p style="margin: 12px 0;">Pass the device to <strong>${nextPlayer.name}</strong></p>
      <button id="ready-btn" class="btn-primary" style="width:100%;">I'm Ready!</button>
    `);

    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
      readyBtn.onclick = () => {
        hideModal();
        updateUI();
      };
    }
  }

  function showModal(contentHtml) {
    if (actionModalBody && actionModal) {
      actionModalBody.innerHTML = contentHtml;
      actionModal.classList.add('active');
    }
  }

  function hideModal() {
    if (actionModal) {
      actionModal.classList.remove('active');
    }
  }

  function updateUI() {
    if (!window.gameEngine || !window.gameEngine.getActivePlayer) return;
    
    const activePlayer = window.gameEngine.getActivePlayer();
    if (!activePlayer) return;

    if (playerTurnIndicator) {
      playerTurnIndicator.textContent = `${activePlayer.name}'s Turn`;
      playerTurnIndicator.style.borderColor = activePlayer.id === 1 ? 'var(--p1-color, #3498db)' : 'var(--p2-color, #e74c3c)';
    }

    if (heatBalanceDisplay) {
      heatBalanceDisplay.textContent = activePlayer.heat ?? 0;
    }

    updateBoardTokens();
  }
});