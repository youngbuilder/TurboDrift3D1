/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TrackId, TrackMetadata } from '../types/game';

export interface Checkpoint {
  index: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  t: number;
}

export interface SpeedPad {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Mesh;
}

export interface ItemBox {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  active: boolean;
  respawnTime: number;
}

export interface TrackData {
  id: TrackId;
  name: string;
  theme: string;
  curve: THREE.CatmullRomCurve3;
  roadMesh: THREE.Mesh;
  curbsMesh: THREE.Mesh;
  railsMesh: THREE.Group;
  sceneryGroup: THREE.Group;
  checkpoints: Checkpoint[];
  speedPads: SpeedPad[];
  itemBoxes: ItemBox[];
  startPosition: THREE.Vector3;
  startDirection: THREE.Vector3;
  trackWidth: number;
  totalLength: number;
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  sunColor: number;
  sunPosition: THREE.Vector3;
  groundMesh: THREE.Mesh;
  frictionMultiplier: number;
}

export const TRACK_METADATA: Record<TrackId, TrackMetadata> = {
  'grand-prix-circuit': {
    id: 'grand-prix-circuit',
    name: '그랜드 프릭스 서킷',
    subtitle: '클래식 프로 레이싱 트랙',
    theme: '프로페셔널 (GP)',
    difficulty: '보통',
    length: '2.5 km',
    themeColor: '#ef4444',
    description: '고속 직선 구간과 날카로운 헤어핀 코너가 조화된 정통 서킷',
    hazards: '넓은 코너 및 스피드 패드',
  },
  'night-street-stadium': {
    id: 'night-street-stadium',
    name: '네온 시티 스트리트',
    subtitle: '화려한 야간 도심 레이스',
    theme: '사이버펑크 (Street)',
    difficulty: '어려움',
    length: '2.1 km',
    themeColor: '#06b6d4',
    description: '네온사인으로 가득한 도심 속 야간 레이스 트랙',
    hazards: '연속 급커브',
  },
  'mountain-tech-circuit': {
    id: 'mountain-tech-circuit',
    name: '마운틴 테크 하이웨이',
    subtitle: '산악 리조트 하이테크 도로',
    theme: '네이처 테크 (Hybrid)',
    difficulty: '익스트림',
    length: '2.8 km',
    themeColor: '#22c55e',
    description: '탁 트인 산악 풍경과 첨단 시설이 어우러진 다이내믹 트랙',
    hazards: '고속 와인딩 코너',
  },
  'city-downtown': {
    id: 'city-downtown',
    name: '다운타운 익스프레스',
    subtitle: '마천루 빌딩 숲 속 고속 질주',
    theme: '메트로폴리스 (City)',
    difficulty: '보통',
    length: '2.3 km',
    themeColor: '#f59e0b',
    description: '높은 빌딩들과 화려한 조명이 반기는 시내 도심 코스',
    hazards: '교차로 및 다이나믹 코너',
  },
};

function createRoadTexture(theme: TrackId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2d333b';
  ctx.fillRect(0, 0, 512, 1024);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 0, 10, 1024);
  ctx.fillRect(478, 0, 10, 1024);

  ctx.fillStyle = '#fbbf24';
  for (let y = 0; y < 1024; y += 120) {
    ctx.fillRect(246, y, 6, 60);
    ctx.fillRect(260, y, 6, 60);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 45);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCurbTexture(theme: TrackId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 128, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 80);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getTrackCurve(id: TrackId): THREE.CatmullRomCurve3 {
  let points: THREE.Vector3[] = [];
  const scale = 1.6;
  if (id === 'grand-prix-circuit') {
    points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(200 * scale, 0, 0),
      new THREE.Vector3(300 * scale, 0, 100 * scale),
      new THREE.Vector3(300 * scale, 0, 300 * scale),
      new THREE.Vector3(0, 0, 400 * scale),
      new THREE.Vector3(-200 * scale, 0, 200 * scale),
      new THREE.Vector3(-100 * scale, 0, 50 * scale),
      new THREE.Vector3(0, 0, 0),
    ];
  } else if (id === 'night-street-stadium') {
    points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100 * scale, 0, -50 * scale),
      new THREE.Vector3(150 * scale, 0, 50 * scale),
      new THREE.Vector3(50 * scale, 0, 150 * scale),
      new THREE.Vector3(-50 * scale, 0, 150 * scale),
      new THREE.Vector3(-100 * scale, 0, 50 * scale),
      new THREE.Vector3(0, 0, 0),
    ];
  } else {
    points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(150 * scale, 0, -100 * scale),
      new THREE.Vector3(350 * scale, 0, 0),
      new THREE.Vector3(350 * scale, 0, 300 * scale),
      new THREE.Vector3(100 * scale, 0, 400 * scale),
      new THREE.Vector3(-100 * scale, 0, 200 * scale),
      new THREE.Vector3(0, 0, 0),
    ];
  }
  points.forEach((p) => (p.y = 0));
  return new THREE.CatmullRomCurve3(points, true, 'centripetal');
}

export function buildTrack(id: TrackId): TrackData {
  const curve = getTrackCurve(id);
  const trackWidth = 42;
  const curbWidth = 1.8;
  const segments = 400;
  const totalLength = curve.getLength();

  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const curbPositions: number[] = [];
  const curbNormals: number[] = [];
  const curbUvs: number[] = [];
  const curbIndices: number[] = [];

  const checkpoints: Checkpoint[] = [];
  const numCheckpoints = 24;
  const points = curve.getSpacedPoints(segments);
  const railsMesh = new THREE.Group();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    if (i % Math.floor(segments / numCheckpoints) === 0 && checkpoints.length < numCheckpoints) {
      checkpoints.push({
        index: checkpoints.length,
        position: points[i].clone(),
        tangent: tangent.clone(),
        normal: normal.clone(),
        binormal: binormal.clone(),
        t,
      });
    }

    const p = points[i];
    const halfW = trackWidth / 2;
    const leftPt = p.clone().addScaledVector(binormal, -halfW);
    const rightPt = p.clone().addScaledVector(binormal, halfW);

    roadPositions.push(leftPt.x, 0.01, leftPt.z);
    roadPositions.push(rightPt.x, 0.01, rightPt.z);
    roadNormals.push(0, 1, 0);
    roadNormals.push(0, 1, 0);

    const vCoord = (i / segments) * 55;
    roadUvs.push(0, vCoord);
    roadUvs.push(1, vCoord);

    const leftCurbOuter = leftPt.clone().addScaledVector(binormal, -curbWidth);
    const rightCurbOuter = rightPt.clone().addScaledVector(binormal, curbWidth);

    curbPositions.push(leftCurbOuter.x, 0.02, leftCurbOuter.z);
    curbPositions.push(leftPt.x, 0.02, leftPt.z);
    curbPositions.push(rightPt.x, 0.02, rightPt.z);
    curbPositions.push(rightCurbOuter.x, 0.02, rightCurbOuter.z);

    curbNormals.push(0, 1, 0);
    curbNormals.push(0, 1, 0);
    curbNormals.push(0, 1, 0);
    curbNormals.push(0, 1, 0);

    curbUvs.push(0, vCoord * 2);
    curbUvs.push(1, vCoord * 2);
    curbUvs.push(0, vCoord * 2);
    curbUvs.push(1, vCoord * 2);
  }

  for (let i = 0; i < segments; i++) {
    const nextI = (i + 1) % (segments + 1);
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = nextI * 2;
    const i3 = nextI * 2 + 1;

    roadIndices.push(i0, i1, i2);
    roadIndices.push(i1, i3, i2);

    const c0 = i * 4;
    const c1 = i * 4 + 1;
    const c2 = i * 4 + 2;
    const c3 = i * 4 + 3;
    const nc0 = nextI * 4;
    const nc1 = nextI * 4 + 1;
    const nc2 = nextI * 4 + 2;
    const nc3 = nextI * 4 + 3;

    curbIndices.push(c0, c1, nc0);
    curbIndices.push(c1, nc1, nc0);
    curbIndices.push(c2, c3, nc2);
    curbIndices.push(c3, nc3, nc2);
  }

  const roadGeom = new THREE.BufferGeometry();
  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeom.setIndex(roadIndices);

  const roadTex = createRoadTexture(id);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.6,
    metalness: 0.2,
  });
  const roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.receiveShadow = true;

  const curbGeom = new THREE.BufferGeometry();
  curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvs, 2));
  curbGeom.setIndex(curbIndices);

  const curbTex = createCurbTexture(id);
  const curbMat = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.5,
  });
  const curbsMesh = new THREE.Mesh(curbGeom, curbMat);
  curbsMesh.receiveShadow = true;

  const startP = curve.getPointAt(0);
  const startT = curve.getTangentAt(0);
  const startB = new THREE.Vector3(0, 1, 0).cross(startT).normalize();

  const startLineCanvas = document.createElement('canvas');
  startLineCanvas.width = 256;
  startLineCanvas.height = 64;
  const sCtx = startLineCanvas.getContext('2d')!;
  for (let x = 0; x < 256; x += 32) {
    for (let y = 0; y < 64; y += 32) {
      sCtx.fillStyle = (x / 32 + y / 32) % 2 === 0 ? '#ffffff' : '#111827';
      sCtx.fillRect(x, y, 32, 32);
    }
  }
  const startLineTex = new THREE.CanvasTexture(startLineCanvas);
  startLineTex.colorSpace = THREE.SRGBColorSpace;

  const startLineMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(trackWidth, 3.5),
    new THREE.MeshStandardMaterial({ map: startLineTex, polygonOffset: true, polygonOffsetFactor: -1 })
  );
  startLineMesh.position.copy(startP).add(new THREE.Vector3(0, 0.04, 0));
  startLineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startB);
  startLineMesh.rotateX(-Math.PI / 2);
  railsMesh.add(startLineMesh);

  const sceneryGroup = new THREE.Group();
  if (id === 'city-downtown' || id === 'night-street-stadium') {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 128;
    bCanvas.height = 256;
    const bCtx = bCanvas.getContext('2d')!;
    bCtx.fillStyle = id === 'night-street-stadium' ? '#0f172a' : '#1e293b';
    bCtx.fillRect(0, 0, 128, 256);
    bCtx.fillStyle = id === 'night-street-stadium' ? '#38bdf8' : '#334155';
    for (let i = 0; i < 256; i += 24) {
      bCtx.fillRect(16, i + 4, 32, 16);
      bCtx.fillRect(64, i + 4, 32, 16);
    }
    const bTex = new THREE.CanvasTexture(bCanvas);
    const bMat = new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.3, metalness: 0.2 });
    const bGeom = new THREE.BoxGeometry(1, 1, 1);
    const numSceneryPoints = 60;
    for (let i = 0; i < numSceneryPoints; i++) {
      const t = i / numSceneryPoints;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const binormal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();

      if (Math.random() > 0.2) {
        const distLeft = 45 + Math.random() * 40;
        const posLeft = pt.clone().addScaledVector(binormal, -distLeft);
        const h = 50 + Math.random() * 130;
        const w = 22 + Math.random() * 28;
        const building = new THREE.Mesh(bGeom, bMat);
        building.scale.set(w, h, w);
        building.position.set(posLeft.x, h / 2, posLeft.z);
        building.castShadow = true;
        building.receiveShadow = true;
        sceneryGroup.add(building);
      }

      if (Math.random() > 0.2) {
        const distRight = 45 + Math.random() * 40;
        const posRight = pt.clone().addScaledVector(binormal, distRight);
        const h = 50 + Math.random() * 130;
        const w = 22 + Math.random() * 28;
        const building = new THREE.Mesh(bGeom, bMat);
        building.scale.set(w, h, w);
        building.position.set(posRight.x, h / 2, posRight.z);
        building.castShadow = true;
        building.receiveShadow = true;
        sceneryGroup.add(building);
      }
    }
  }

  const groundGeom = new THREE.PlaneGeometry(2000, 2000, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
  });
  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, -0.05, 160);
  groundMesh.receiveShadow = true;

  const startPosition = curve.getPointAt(0).add(new THREE.Vector3(0, 0.4, 0));
  const startDirection = curve.getTangentAt(0).normalize();

  return {
    id,
    name: TRACK_METADATA[id].name,
    theme: TRACK_METADATA[id].theme,
    curve,
    roadMesh,
    curbsMesh,
    railsMesh,
    sceneryGroup,
    checkpoints,
    speedPads: [],
    itemBoxes: [],
    startPosition,
    startDirection,
    trackWidth,
    totalLength,
    skyColor: 0x1e293b,
    fogColor: 0x334155,
    ambientColor: 0x64748b,
    sunColor: 0xffffff,
    sunPosition: new THREE.Vector3(150, 220, 100),
    groundMesh,
    frictionMultiplier: 1.0,
  };
}
