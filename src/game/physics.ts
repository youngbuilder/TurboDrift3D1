/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { AIDifficulty, CarModelType, ItemType, TeamId, VEHICLE_CONFIGS } from '../types/game';
import { sound } from './audio';
import { TrackData } from './tracks';

export interface VehicleInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  useItem: boolean;
}

export interface VehicleState {
  modelType: CarModelType;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  speedKmh: number;
  steerAngle: number;
  driftAngle: number;
  isDrifting: boolean;
  driftChargeTime: number;
  driftBoostLevel: 0 | 1 | 2 | 3;
  wheelRotation: number;
  isBoosting: boolean;
  boostTimer: number;
  activeBoostLevel: 0 | 1 | 2 | 3;
  hasShield: boolean;
  shieldTimer: number;
  isSpinning: boolean;
  spinTimer: number;
  currentItem: ItemType | null;
  currentLap: number;
  currentCheckpoint: number;
  trackT: number;
  totalProgress: number;
  isFinished: boolean;
  finishTime: number;
  rank: number;
  hasReachedHalfway?: boolean;
}

export interface BotRacer {
  id: string;
  name: string;
  carModel: CarModelType;
  carColor: string;
  accentColor: string;
  neonColor: string;
  team: TeamId;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  trackT: number;
  lateralOffset: number;
  speedKmh: number;
  targetSpeed: number;
  accelRate: number;
  lap: number;
  checkpoint: number;
  totalProgress: number;
  isFinished: boolean;
  finishTime: number;
  rank: number;
  wheelRotation: number;
  steerAngle: number;
  isBoosting: boolean;
  boostTimer: number;
  isSpinning: boolean;
  spinTimer: number;
  hasReachedHalfway?: boolean;
}

export class PhysicsEngine {
  public static initPlayerState(
    startPos: THREE.Vector3,
    startDir: THREE.Vector3,
    gridIndex: number = 0,
    modelType: CarModelType = 'sport'
  ): VehicleState {
    const startQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), startDir);
    const sideDir = new THREE.Vector3(0, 1, 0).cross(startDir).normalize();
    const sideOffset = gridIndex % 2 === 0 ? -5.5 : 5.5;
    const backOffset = Math.floor(gridIndex / 2) * -9.0;
    const initialPos = startPos.clone()
      .addScaledVector(sideDir, sideOffset)
      .addScaledVector(startDir, backOffset);

    return {
      modelType,
      position: initialPos,
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      quaternion: startQuat,
      velocity: new THREE.Vector3(0, 0, 0),
      speedKmh: 0,
      steerAngle: 0,
      driftAngle: 0,
      isDrifting: false,
      driftChargeTime: 0,
      driftBoostLevel: 0,
      wheelRotation: 0,
      isBoosting: false,
      boostTimer: 0,
      activeBoostLevel: 0,
      hasShield: false,
      shieldTimer: 0,
      isSpinning: false,
      spinTimer: 0,
      currentItem: null,
      currentLap: 1,
      currentCheckpoint: 0,
      trackT: 0,
      totalProgress: 0,
      isFinished: false,
      finishTime: 0,
      rank: 1,
      hasReachedHalfway: false,
    };
  }

  public static resetToLastCheckpoint(state: VehicleState, track: TrackData) {
    const cpIndex = state.currentCheckpoint || 0;
    const cp = track.checkpoints[cpIndex] || track.checkpoints[0];
    if (cp) {
      state.position.copy(cp.position).add(new THREE.Vector3(0, 0.4, 0));
      state.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cp.tangent);
    }
    state.speedKmh = 0;
    state.isSpinning = false;
    state.isBoosting = false;
    state.driftChargeTime = 0;
    state.driftBoostLevel = 0;
  }

  public static updatePlayer(
    state: VehicleState,
    input: VehicleInput,
    delta: number,
    track: TrackData,
    totalLaps: number
  ) {
    if (state.isFinished) {
      state.speedKmh = Math.max(0, state.speedKmh - 40 * delta);
      state.position.addScaledVector(
        new THREE.Vector3(0, 0, 1).applyQuaternion(state.quaternion),
        (state.speedKmh / 3.6) * delta
      );
      return;
    }

    if (state.isSpinning) {
      state.spinTimer -= delta;
      state.speedKmh = Math.max(20, state.speedKmh - 120 * delta);
      state.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 14 * delta));
      if (state.spinTimer <= 0) {
        state.isSpinning = false;
      }
      return;
    }

    if (state.isBoosting) {
      state.boostTimer -= delta;
      if (state.boostTimer <= 0) {
        state.isBoosting = false;
        state.activeBoostLevel = 0;
      }
    }

    if (state.hasShield) {
      state.shieldTimer -= delta;
      if (state.shieldTimer <= 0) {
        state.hasShield = false;
      }
    }

    const cfg = VEHICLE_CONFIGS[state.modelType] || VEHICLE_CONFIGS.sport;
    const baseMaxSpeed = cfg.maxSpeed;
    const extraMax = state.isBoosting ? (state.activeBoostLevel === 3 ? 120 : (state.activeBoostLevel === 2 ? 75 : 40)) : 0;
    const boostMaxSpeed = cfg.maxSpeed + extraMax;
    const maxSpeed = state.isBoosting ? boostMaxSpeed : baseMaxSpeed;
    const accelRate = (state.isBoosting ? cfg.acceleration * 2.0 : cfg.acceleration) * 1.6;
    const brakeRate = 180;
    const dragRate = 35;

    if (input.forward) {
      state.speedKmh = Math.min(maxSpeed, state.speedKmh + accelRate * delta);
    } else if (input.backward) {
      if (state.speedKmh > 5) {
        state.speedKmh = Math.max(0, state.speedKmh - brakeRate * delta);
      } else {
        state.speedKmh = Math.max(-50, state.speedKmh - 50 * delta);
      }
    } else {
      if (state.speedKmh > 0) {
        state.speedKmh = Math.max(0, state.speedKmh - dragRate * delta);
      } else if (state.speedKmh < 0) {
        state.speedKmh = Math.min(0, state.speedKmh + dragRate * delta);
      }
    }

    const targetSteer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerResponsiveness = 15 * (cfg.handling / 0.5);
    state.steerAngle = THREE.MathUtils.damp(state.steerAngle, targetSteer * cfg.handling * 1.5, steerResponsiveness, delta);

    const canDrift = Math.abs(state.speedKmh) > 25 && (input.drift || Math.abs(targetSteer) > 0.1);
    if (input.drift && canDrift) {
      if (!state.isDrifting) {
        state.isDrifting = true;
        state.driftChargeTime = 0.4;
      }
      state.driftChargeTime += delta * cfg.driftPower * 3.5;
      if (state.driftChargeTime >= 2.0) {
        state.driftBoostLevel = 3;
      } else if (state.driftChargeTime >= 1.1) {
        state.driftBoostLevel = 2;
      } else if (state.driftChargeTime >= 0.4) {
        state.driftBoostLevel = 1;
      }
      const targetDriftAngle = targetSteer * 0.85;
      state.driftAngle = THREE.MathUtils.damp(state.driftAngle, targetDriftAngle, 6, delta);
    } else {
      if (state.isDrifting) {
        if (state.driftBoostLevel > 0) {
          const boostDurations = [0, 1.2, 2.0, 3.8];
          const boostSpeeds = [0, 35, 75, 130];
          state.isBoosting = true;
          state.boostTimer = boostDurations[state.driftBoostLevel];
          state.activeBoostLevel = state.driftBoostLevel;
          const extraMax = state.driftBoostLevel === 3 ? 120 : (state.driftBoostLevel === 2 ? 75 : 40);
          const boostMax = cfg.maxSpeed + extraMax;
          state.speedKmh = Math.min(boostMax, state.speedKmh + boostSpeeds[state.driftBoostLevel] * cfg.driftPower);
          sound.playBoost();
        }
        state.isDrifting = false;
        state.driftChargeTime = 0;
        state.driftBoostLevel = 0;
      }
      state.driftAngle = THREE.MathUtils.damp(state.driftAngle, 0, 10, delta);
    }

    const trackFriction = track.frictionMultiplier || 1.0;
    const turnSensitivity = (state.isDrifting ? 2.5 : 1.8) * (cfg.handling / 0.65) * trackFriction;
    const speedFactor = Math.min(1.0, Math.max(0.2, Math.abs(state.speedKmh) / 100));
    const yawDelta = state.steerAngle * turnSensitivity * speedFactor * (state.speedKmh >= 0 ? 1 : -1) * delta;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawDelta);
    state.quaternion.multiply(yawQuat);

    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(state.quaternion);
    if (state.isDrifting) {
      const sideVec = new THREE.Vector3(1, 0, 0).applyQuaternion(state.quaternion);
      forwardVec.addScaledVector(sideVec, state.driftAngle * 0.55).normalize();
    }

    const moveDistance = (state.speedKmh / 3.6) * delta;
    state.position.addScaledVector(forwardVec, moveDistance);
    state.wheelRotation += moveDistance / 0.38;

    let closestCp = track.checkpoints[0];
    let minDist = 999999;
    for (const cp of track.checkpoints) {
      const d = state.position.distanceTo(cp.position);
      if (d < minDist) {
        minDist = d;
        closestCp = cp;
      }
    }
    state.position.y = THREE.MathUtils.damp(state.position.y, closestCp.position.y, 15, 0.016);

    PhysicsEngine.updateProgress(state, track, totalLaps);

    track.speedPads.forEach((pad) => {
      if (state.position.distanceTo(pad.position) < 4.4) {
        if (!state.isBoosting) {
          state.isBoosting = true;
          state.boostTimer = 2.0;
          state.speedKmh = THREE.MathUtils.clamp(state.speedKmh + 65, 140, boostMaxSpeed);
          sound.playBoost();
        }
      }
    });

    track.itemBoxes.forEach((box) => {
      if (box.active && state.position.distanceTo(box.position) < 3.2) {
        box.active = false;
        box.mesh.visible = false;
        box.respawnTime = 8.0;
        if (!state.currentItem) {
          const items: ItemType[] = ['nitro', 'shield', 'trap', 'rocket', 'nitro'];
          state.currentItem = items[Math.floor(Math.random() * items.length)];
          sound.playItemBoxCollect();
        }
      }
    });

    track.itemBoxes.forEach((box) => {
      if (!box.active) {
        box.respawnTime -= delta;
        if (box.respawnTime <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
      }
    });
  }

  private static updateProgress(state: VehicleState, track: TrackData, totalLaps: number) {
    let bestT = state.trackT || 0;
    let minDist = 999999;
    const samples = 45;
    const startT = Math.max(0, bestT - 0.25);
    const endT = Math.min(1.0, bestT + 0.25);

    for (let i = 0; i <= samples; i++) {
      const t = startT + (i / samples) * (endT - startT);
      const pt = track.curve.getPointAt(t);
      const d = state.position.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = t;
      }
    }

    for (let offset of [-1.0, 1.0]) {
      const testT = state.trackT + offset;
      if (testT >= 0 && testT <= 1) {
        const pt = track.curve.getPointAt(testT);
        const d = state.position.distanceTo(pt);
        if (d < minDist) {
          minDist = d;
          bestT = testT >= 1 ? testT - 1 : testT < 0 ? testT + 1 : testT;
        }
      }
    }

    const distToStart = state.position.distanceTo(track.startPosition);
    if (distToStart < 30 && state.trackT > 0.7) {
      bestT = 0.01;
    }

    const prevT = state.trackT;
    state.trackT = bestT;

    if (prevT > 0.8 && bestT < 0.2) {
      state.currentLap += 1;
      if (state.currentLap > totalLaps) {
        state.isFinished = true;
        state.finishTime = Date.now();
        sound.playVictoryFanfare();
      } else {
        sound.playLapChime();
      }
    }

    state.currentCheckpoint = Math.floor(bestT * track.checkpoints.length);
    state.totalProgress = state.currentLap - 1 + bestT;
  }

  public static useItem(state: VehicleState): { type: ItemType; position: THREE.Vector3 } | null {
    if (!state.currentItem) return null;
    const item = state.currentItem;
    state.currentItem = null;

    if (item === 'nitro') {
      state.isBoosting = true;
      state.boostTimer = 3.2;
      const cfg = VEHICLE_CONFIGS[state.modelType] || VEHICLE_CONFIGS.sport;
      state.speedKmh = Math.min(cfg.maxSpeed + 55, state.speedKmh + 75);
      sound.playBoost();
      return { type: 'nitro', position: state.position.clone() };
    } else if (item === 'shield') {
      state.hasShield = true;
      state.shieldTimer = 6.0;
      return { type: 'shield', position: state.position.clone() };
    } else if (item === 'trap') {
      const behind = state.position.clone().addScaledVector(
        new THREE.Vector3(0, 0, -1).applyQuaternion(state.quaternion),
        3.5
      );
      return { type: 'trap', position: behind };
    } else if (item === 'rocket') {
      sound.playRocketLaunch();
      return { type: 'rocket', position: state.position.clone() };
    }
    return null;
  }

  public static hitVehicle(state: VehicleState) {
    if (state.hasShield) {
      state.hasShield = false;
      return;
    }
    state.isSpinning = true;
    state.spinTimer = 1.0;
    sound.playSpinout();
  }

  public static initBots(
    count: number,
    track: TrackData,
    difficulty: AIDifficulty = 'medium',
    gameMode: string = 'solo'
  ): BotRacer[] {
    const botColors = [
      '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#3b82f6',
      '#14b8a6', '#f43f5e', '#a855f7', '#eab308', '#06b6d4'
    ];
    const botModels: CarModelType[] = ['sport', 'bike', 'sedan', 'suv'];
    
    const baseSpeed = difficulty === 'easy' ? 120 : difficulty === 'medium' ? 155 : 195;
    const accelFactor = difficulty === 'easy' ? 40 : difficulty === 'medium' ? 65 : 95;

    const bots: BotRacer[] = [];
    const botCount = Math.min(10, Math.max(0, count));
    for (let i = 0; i < botCount; i++) {
      const gridIndex = i + 1;
      const randNum = Math.floor(100 + Math.random() * 900);
      const botName = `AI-${randNum}`;
      const startP = track.curve.getPointAt(0);
      const startT = track.curve.getTangentAt(0);
      const startB = new THREE.Vector3(0, 1, 0).cross(startT).normalize();
      const sideOffset = gridIndex % 2 === 0 ? -5.5 : 5.5;
      const backOffset = Math.floor(gridIndex / 2) * -9.0;
      const pos = startP.clone()
        .addScaledVector(startB, sideOffset)
        .addScaledVector(startT, backOffset)
        .add(new THREE.Vector3(0, 0.4, 0));
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), startT);
      const model = botModels[i % botModels.length];
      let team: TeamId = 'none';
      if (gameMode === 'team2' || gameMode === 'team4') {
        team = i % 2 === 0 ? 'blue' : 'red';
      }

      bots.push({
        id: `bot_${i}`,
        name: botName,
        carModel: model,
        carColor: botColors[i % botColors.length],
        accentColor: '#ffffff',
        neonColor: botColors[(i + 2) % botColors.length],
        team,
        position: pos,
        quaternion: quat,
        trackT: 0,
        lateralOffset: sideOffset * 0.8,
        speedKmh: 0,
        targetSpeed: baseSpeed + (Math.random() - 0.5) * 10,
        accelRate: accelFactor,
        lap: 1,
        checkpoint: 0,
        totalProgress: 0,
        isFinished: false,
        finishTime: 0,
        rank: gridIndex + 1,
        wheelRotation: 0,
        steerAngle: 0,
        isBoosting: false,
        boostTimer: 0,
        isSpinning: false,
        spinTimer: 0,
        hasReachedHalfway: false,
      });
    }
    return bots;
  }

  public static updateBots(bots: BotRacer[], delta: number, track: TrackData, totalLaps: number) {
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const b1 = bots[i];
        const b2 = bots[j];
        const dist = b1.position.distanceTo(b2.position);
        if (dist < 5.0) {
          const pushDir = b1.lateralOffset > b2.lateralOffset ? 1 : -1;
          b1.lateralOffset += pushDir * 0.8 * delta;
          b2.lateralOffset -= pushDir * 0.8 * delta;
          b1.lateralOffset = THREE.MathUtils.clamp(b1.lateralOffset, -18, 18);
          b2.lateralOffset = THREE.MathUtils.clamp(b2.lateralOffset, -18, 18);
        }
      }
    }

    bots.forEach((bot) => {
      if (bot.isFinished) return;
      if (bot.isSpinning) {
        bot.spinTimer -= delta;
        bot.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 10 * delta));
        if (bot.spinTimer <= 0) bot.isSpinning = false;
        return;
      }
      if (bot.isBoosting) {
        bot.boostTimer -= delta;
        if (bot.boostTimer <= 0) bot.isBoosting = false;
      }

      const maxSpd = bot.isBoosting ? bot.targetSpeed + 35 : bot.targetSpeed;
      bot.speedKmh = THREE.MathUtils.damp(bot.speedKmh, maxSpd, 2.5, delta);
      const moveMeters = (bot.speedKmh / 3.6) * delta;

      const deltaT = moveMeters / track.totalLength;
      bot.trackT += deltaT;
      if (bot.trackT >= 1.0) {
        bot.trackT -= 1.0;
        bot.lap += 1;
        if (bot.lap > totalLaps) {
          bot.isFinished = true;
          bot.finishTime = Date.now();
        }
      }

      const cpIndex = Math.floor(bot.trackT * track.checkpoints.length);
      bot.checkpoint = cpIndex;

      const splinePt = track.curve.getPointAt(bot.trackT);
      const tangent = track.curve.getTangentAt(bot.trackT);
      const binormal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();

      bot.position.copy(splinePt)
        .addScaledVector(binormal, bot.lateralOffset)
        .add(new THREE.Vector3(0, 0.4, 0));
      bot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      bot.totalProgress = bot.lap - 1 + bot.trackT;
      bot.wheelRotation += moveMeters / 0.38;

      if (Math.random() < 0.002 && !bot.isBoosting) {
        bot.isBoosting = true;
        bot.boostTimer = 1.8;
      }
    });
  }
}
