/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CarModelType = 'sport' | 'bike' | 'sedan' | 'suv';
export type GameMode = 'solo' | 'team2' | 'team4';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type TeamId = 'red' | 'blue' | 'green' | 'yellow' | 'none';

export interface VehicleStats {
  id: CarModelType;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  maxSpeed: number; // km/h
  acceleration: number;
  handling: number;
  driftPower: number;
  offroadGrip: number;
  weight: number;
}

export const VEHICLE_CONFIGS: Record<CarModelType, VehicleStats> = {
  sport: {
    id: 'sport',
    name: '스포츠카',
    nameEn: 'Sports Car',
    category: '하이퍼 스피드',
    description: '최고 속도와 날렵한 드리프트 능력을 자랑하는 머신',
    maxSpeed: 210,
    acceleration: 90,
    handling: 0.50,
    driftPower: 1.2,
    offroadGrip: 0.4,
    weight: 1.2,
  },
  bike: {
    id: 'bike',
    name: '슈퍼 바이크',
    nameEn: 'Superbike',
    category: '극한의 코너링',
    description: '날렵하고 민첩한 코너링과 빠른 가속력',
    maxSpeed: 160,
    acceleration: 95,
    handling: 0.95,
    driftPower: 1.4,
    offroadGrip: 0.4,
    weight: 0.7,
  },
  sedan: {
    id: 'sedan',
    name: '스포츠 세단',
    nameEn: 'Sedan',
    category: '안정적인 주행',
    description: '균형 잡힌 핸들링과 부드러운 드라이빙',
    maxSpeed: 175,
    acceleration: 80,
    handling: 0.70,
    driftPower: 1.0,
    offroadGrip: 0.6,
    weight: 1.0,
  },
  suv: {
    id: 'suv',
    name: '오프로드 SUV',
    nameEn: 'SUV',
    category: '파워풀 돌파',
    description: '단단한 차체와 묵직한 주행감',
    maxSpeed: 190,
    acceleration: 85,
    handling: 0.60,
    driftPower: 1.1,
    offroadGrip: 0.8,
    weight: 1.6,
  },
};

export interface CarCustomization {
  model: CarModelType;
  color: string;
  accentColor: string;
  neonColor: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  carModel: CarModelType;
  carColor: string;
  accentColor: string;
  neonColor: string;
  isHost: boolean;
  isReady: boolean;
  team: TeamId;
  lap: number;
  checkpoint: number;
  progress: number;
  finished: boolean;
  finishTime: number;
  place: number;
}

export type TrackId =
  | 'grand-prix-circuit'
  | 'night-street-stadium'
  | 'mountain-tech-circuit'
  | 'city-downtown';

export interface TrackMetadata {
  id: TrackId;
  name: string;
  subtitle: string;
  theme: string;
  difficulty: '쉬움' | '보통' | '어려움' | '익스트림';
  length: string;
  themeColor: string;
  description: string;
  hazards: string;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  trackId: TrackId;
  laps: number;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  aiBotsCount: number;
  state: 'lobby' | 'countdown' | 'racing' | 'finished';
  players: PlayerInfo[];
}

export interface RoomSummary {
  id: string;
  name: string;
  hostName: string;
  trackId: TrackId;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  playerCount: number;
  maxPlayers: number;
  state: 'lobby' | 'racing';
}

export type ItemType = 'nitro' | 'shield' | 'trap' | 'rocket' | 'timeWarp';

export interface PeerCarState {
  playerId: string;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  speed: number;
  steer: number;
  drifting: boolean;
  boosting: boolean;
  lap: number;
  progress: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  emoji?: string;
  timestamp: number;
}
