// farmer.js — the farmer: chases, searches and corners. He is the clock
// and the threat at once. His gap behind the turkey shrinks whenever the
// turkey stumbles, grows when the turkey dashes or hides well, and if the
// turkey hides too long he gets suspicious and corners the haystack.

import {
  FARMER_START_GAP_M, FARMER_CATCH_GAP_M, FARMER_MAX_GAP_M,
  FARMER_TARGET_GAP_M, FARMER_RUBBER_SLOPE,
  FARMER_STUMBLE_PENALTY_M, FARMER_SEARCH_GAIN_M,
  FARMER_SEARCH_SUSPICION_RATE, FARMER_CORNER_SPEED_M,
} from './config.js';
import { clamp } from './random.js';

export const FARMER_STATE = {
  CHASE: 'chase',
  SEARCH: 'search',
  CORNER: 'corner',
  CAUGHT: 'caught',
  GIVING_UP: 'giving_up',
};

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.gapM = FARMER_START_GAP_M;
    this.state = FARMER_STATE.CHASE;
    this.stateT = 0;
    this.suspicion = 0; // 0..1, grows while the turkey hides
    this.runPhase = 0;
    this.searchX = 0; // where he stands while searching, screen px
    this.searchDir = 1;
    this.searchSweeps = 0;
    this.angryT = 0;
    this.yellT = 0;
    this.speedM = 0;
    this.spotted = false; // set true the frame he notices a hide
  }

  get caught() {
    return this.state === FARMER_STATE.CAUGHT;
  }

  get close() {
    return this.gapM < 6;
  }

  get veryClose() {
    return this.gapM < 3;
  }

  // The turkey stumbled into an obstacle: the farmer gains ground.
  onStumble() {
    this.gapM = Math.max(FARMER_CATCH_GAP_M, this.gapM - FARMER_STUMBLE_PENALTY_M);
    this.angryT = 1.2;
    this.yellT = 0.6;
  }

  // The turkey dashed: a burst of speed buys a little room.
  onDash() {
    this.gapM = clamp(this.gapM + 0.9, 0, FARMER_MAX_GAP_M);
  }

  // The turkey slipped into a haystack: the farmer stops, looks around.
  onHide(audio) {
    if (this.state !== FARMER_STATE.SEARCH && this.state !== FARMER_STATE.CORNER) {
      this.state = FARMER_STATE.SEARCH;
      this.stateT = 0;
      this.searchSweeps = 0;
      this.spotted = true;
      if (audio) audio.spotted();
    }
  }

  // The turkey left the haystack: chase resumes, suspicion fades.
  // (Also the escape from CORNER: once the turkey bolts, the farmer
  // has to chase again instead of closing in for a guaranteed grab.)
  onUnhide() {
    if (this.state === FARMER_STATE.SEARCH || this.state === FARMER_STATE.CORNER) {
      this.state = FARMER_STATE.CHASE;
      this.stateT = 0;
      this.suspicion = Math.max(0, this.suspicion - 0.35);
    }
  }

  update(dt, player, audio) {
    this.stateT += dt;
    if (this.angryT > 0) this.angryT -= dt;
    if (this.yellT > 0) this.yellT -= dt;
    this.runPhase += dt * 11;

    switch (this.state) {
      case FARMER_STATE.CHASE: {
        // Rubber-band: he runs a touch faster than the turkey when the
        // gap is wide (so he drifts back into view at the left edge) and
        // a touch slower when he is already breathing down its neck (so
        // a clean run is not a slow death sentence). A dash or a good
        // hide still buys real room — it just decays over ~10 seconds.
        const turkeySpeedM = player.speed * 0.02;
        const factor = clamp(1.0 + (this.gapM - FARMER_TARGET_GAP_M) * FARMER_RUBBER_SLOPE, 0.95, 1.10);
        const farmerSpeedM = turkeySpeedM * factor;
        this.speedM = farmerSpeedM;
        this.gapM = clamp(this.gapM + (turkeySpeedM - farmerSpeedM) * dt, 0, FARMER_MAX_GAP_M);
        // Dashing turkey pulls away faster.
        if (player.dashing) this.gapM = clamp(this.gapM + 1.4 * dt, 0, FARMER_MAX_GAP_M);
        // Stumbling turkey is caught up on quickly.
        if (player.stumbleT > 0) this.gapM = Math.max(0, this.gapM - 1.8 * dt);
        break;
      }
      case FARMER_STATE.SEARCH: {
        // He creeps toward the haystack, peering left and right.
        this.searchSweeps += dt;
        this.searchDir = Math.sin(this.searchSweeps * 1.6) > 0 ? 1 : -1;
        this.gapM = clamp(this.gapM + FARMER_SEARCH_GAIN_M * dt, 0, FARMER_MAX_GAP_M);
        this.suspicion += FARMER_SEARCH_SUSPICION_RATE * dt;
        if (this.suspicion >= 1) {
          this.state = FARMER_STATE.CORNER;
          this.stateT = 0;
          if (audio) audio.found();
        }
        break;
      }
      case FARMER_STATE.CORNER: {
        // He found the haystack. He closes in fast; the turkey must run.
        this.gapM = Math.max(0, this.gapM - FARMER_CORNER_SPEED_M * dt);
        this.angryT = 0.5;
        break;
      }
      case FARMER_STATE.GIVING_UP: {
        this.gapM = clamp(this.gapM + 6 * dt, 0, FARMER_MAX_GAP_M);
        break;
      }
      default:
        break;
    }

    if (this.gapM <= FARMER_CATCH_GAP_M && this.state !== FARMER_STATE.CAUGHT) {
      this.state = FARMER_STATE.CAUGHT;
      this.stateT = 0;
    }
  }

  // Screen x of the farmer, just off the left edge when the gap is large.
  // The gap is in metres; 1 m = 50 px of screen distance.
  screenX(playerX) {
    return playerX - 60 - this.gapM * 50;
  }

  // How panicked the warning meter should look, 0..1.
  dangerLevel() {
    return clamp(1 - this.gapM / FARMER_MAX_GAP_M, 0, 1);
  }
}
