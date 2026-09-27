/**
 * gameEngine.js
 * Manages game state, movement math, turn switches, and territory tracking.
 */

class GameEngine {
  constructor() {
    this.gameState = {
      gameMode: 'short',        // 'short' (4 tiles) or 'long' (12 tiles)
      outerSpice: 'romantic',   // 'romantic' or 'sensual'
      innerSpice: 'tease',      // 'tease' or 'erotic'
      activePlayer: 1,          // Player 1 or Player 2
      players: {
        1: { id: 1, name: 'Player 1', position: 1, currentRing: 'outer', heat: 0, territory: [] },
        2: { id: 2, name: 'Player 2', position: 1, currentRing: 'outer', heat: 0, territory: [] }
      },
      tileOwnership: {},        // e.g. { tile_1: 1, tile_2: 2 }
      isGameOver: false,
      awaitingAction: false
    };

    // Route mappings for the board geometry
    this.outerPath = [1, 2, 3, 4, 5, 6, 7, 8];
    this.innerPath = [9, 10, 11, 12];
  }

  // Initialize pre-game setup choices
  init(config) {
    this.gameState.gameMode = config.gameMode;
    this.gameState.outerSpice = config.outerSpice;
    this.gameState.innerSpice = config.innerSpice;
    this.gameState.activePlayer = 1;
    this.gameState.isGameOver = false;
    this.gameState.tileOwnership = {};
    
    // Reset player states
    [1, 2].forEach(p => {
      this.gameState.players[p].position = 1;
      this.gameState.players[p].currentRing = 'outer';
      this.gameState.players[p].heat = 0;
      this.gameState.players[p].territory = [];
    });
  }

  // Roll restricted 1-3 die
  rollDie() {
    return Math.floor(Math.random() * 3) + 1;
  }

  // Calculate new position following ring paths and junction logic
  movePlayer(rollValue) {
    const player = this.gameState.players[this.gameState.activePlayer];
    let path = player.currentRing === 'outer' ? this.outerPath : this.innerPath;
    let currentIndex = path.indexOf(player.position);
    
    let hitJunction = false;
    let stepsRemaining = rollValue;

    while (stepsRemaining > 0) {
      currentIndex = (currentIndex + 1) % path.length;
      player.position = path[currentIndex];
      stepsRemaining--;

      // Check if player lands on or crosses Gateway Junction (Tile 5) while in Outer Ring
      if (player.currentRing === 'outer' && player.position === 5) {
        hitJunction = true;
        break; // Pause movement at the Gateway Junction
      }
    }

    return {
      newPosition: player.position,
      currentRing: player.currentRing,
      hitJunction: hitJunction
    };
  }

  // Switch player ring at Gateway Junction
  enterInnerRing() {
    const player = this.gameState.players[this.gameState.activePlayer];
    player.currentRing = 'inner';
    player.position = 9; // Enter at first inner tile
  }

  // Modify Heat Currency
  addHeat(playerId, amount) {
    this.gameState.players[playerId].heat += amount;
  }

  spendHeat(playerId, amount) {
    if (this.gameState.players[playerId].heat >= amount) {
      this.gameState.players[playerId].heat -= amount;
      return true;
    }
    return false;
  }

  // Claim unowned tile
  claimTile(tileId, playerId) {
    this.gameState.tileOwnership[tileId] = playerId;
    if (!this.gameState.players[playerId].territory.includes(tileId)) {
      this.gameState.players[playerId].territory.push(tileId);
    }
    this.checkWinCondition();
  }

  // Transfer ownership during a successful Takeover
  transferTile(tileId, newOwnerId) {
    const previousOwnerId = this.gameState.tileOwnership[tileId];
    if (previousOwnerId) {
      const prevTerritory = this.gameState.players[previousOwnerId].territory;
      const index = prevTerritory.indexOf(tileId);
      if (index > -1) prevTerritory.splice(index, 1);
    }
    this.claimTile(tileId, newOwnerId);
  }

  // Switch current turn
  switchTurn() {
    this.gameState.activePlayer = this.gameState.activePlayer === 1 ? 2 : 1;
  }

  // Check end game rules
  checkWinCondition() {
    const p1Count = this.gameState.players[1].territory.length;
    const p2Count = this.gameState.players[2].territory.length;
    const totalClaimed = Object.keys(this.gameState.tileOwnership).length;

    if (this.gameState.gameMode === 'short') {
      if (p1Count >= 4 || p2Count >= 4) {
        this.gameState.isGameOver = true;
      }
    } else if (this.gameState.gameMode === 'long') {
      if (totalClaimed >= 12) {
        this.gameState.isGameOver = true;
      }
    }
  }

  getActivePlayer() {
    return this.gameState.players[this.gameState.activePlayer];
  }

  getOpponentPlayer() {
    const opponentId = this.gameState.activePlayer === 1 ? 2 : 1;
    return this.gameState.players[opponentId];
  }
}

window.gameEngine = new GameEngine();