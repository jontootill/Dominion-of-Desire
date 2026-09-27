class CardManager {
  constructor() {
    this.challenges = [];
    this.modifiers = [];
  }

  async loadData() {
    try {
      const challengesRes = await fetch('assets/data/challenges.json');
      this.challenges = await challengesRes.json();
      console.log("Loaded challenges array:", this.challenges);

      const modifiersRes = await fetch('assets/data/modifiers.json');
      this.modifiers = await modifiersRes.json();
    } catch (err) {
      console.error('Error loading game card/challenge data:', err);
    }
  }

  getChallengeForTile(rawTileId, intensitySetting) {
    console.log("--- DEBUG getChallengeForTile ---");
    console.log("Input tileId passed in:", rawTileId);
    console.log("Current challenges array length:", this.challenges ? this.challenges.length : 0);

    if (!this.challenges || this.challenges.length === 0) {
      console.warn("Array this.challenges is EMPTY or null!");
      return null;
    }

    const num = String(rawTileId).replace('tile_', '');
    const formattedId = `tile_${num}`;

    // Look for exact match
    const tileData = this.challenges.find(item => 
      String(item.tile_id) === formattedId || 
      String(item.tile_id) === num
    );

    console.log("Matched tileData from JSON:", tileData);

    if (!tileData) {
      console.warn("Could not find matching tile_id in challenges array for:", formattedId);
      return null;
    }

    let variant = null;
    if (tileData.variants) {
      variant = tileData.variants[intensitySetting] || 
                tileData.variants['romantic'] || 
                tileData.variants['sensual'] || 
                Object.values(tileData.variants)[0];
    } else {
      variant = tileData;
    }

    console.log("Selected variant:", variant);

    const result = {
      tile_name: tileData.tile_name || tileData.name || null,
      rent_task: variant?.rent_task || 'Perform 30 seconds of gentle touch.',
      takeover_challenge: variant?.takeover_challenge || 'Perform a challenge.'
    };

    console.log("Final returned result object:", result);
    return result;
  }

  drawRandomModifier() {
    if (!this.modifiers || this.modifiers.length === 0) {
      return {
        name: 'Sensual Touch',
        description: 'Perform the action with extra slow movements.'
      };
    }
    const randomIndex = Math.floor(Math.random() * this.modifiers.length);
    return this.modifiers[randomIndex];
  }
}

window.cardManager = new CardManager();