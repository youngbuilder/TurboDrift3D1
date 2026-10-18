/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarCustomization, CarModelType } from '../types/game';

export interface CarVisuals {
  group: THREE.Group;
  innerBody: THREE.Group;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  boostFlameLeft: THREE.Mesh;
  boostFlameRight: THREE.Mesh;
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  underglowLight: THREE.PointLight;
  contactShadow: THREE.Mesh;
  isTwoWheeled: boolean;
  materials: {
    body: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    neon: THREE.MeshBasicMaterial;
  };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createProceduralWheel(rimColor: string, radius: number = 0.38, width: number = 0.32): THREE.Group {
  const wheelGroup = new THREE.Group();
  const tireGeom = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeom.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.1,
  });
  const tire = new THREE.Mesh(tireGeom, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  const rimGeom = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.01, 14);
  rimGeom.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rimColor),
    metalness: 0.9,
    roughness: 0.2,
  });
  const rim = new THREE.Mesh(rimGeom, rimMat);
  wheelGroup.add(rim);

  const nutGeom = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.03, 8);
  nutGeom.rotateZ(Math.PI / 2);
  const nutMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95 });
  const nut = new THREE.Mesh(nutGeom, nutMat);
  wheelGroup.add(nut);

  return wheelGroup;
}

export function buildProceduralCar(customization: CarCustomization): CarVisuals {
  const carGroup = new THREE.Group();
  const innerBody = new THREE.Group();
  carGroup.add(innerBody);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.color),
    metalness: 0.85,
    roughness: 0.25,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.accentColor),
    metalness: 0.6,
    roughness: 0.4,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.4,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    transmission: 0.75,
    roughness: 0.1,
    metalness: 0.1,
    ior: 1.5,
    transparent: true,
    opacity: 0.9,
  });

  const neonMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(customization.neonColor),
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.1,
  });

  const modelType: CarModelType = customization.model;
  let isTwoWheeled = false;
  let frontLeftWheel: THREE.Group = new THREE.Group();
  let frontRightWheel: THREE.Group = new THREE.Group();
  let rearLeftWheel: THREE.Group = new THREE.Group();
  let rearRightWheel: THREE.Group = new THREE.Group();

  if (modelType === 'sport') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 3.8), bodyMat);
    chassis.position.y = 0.34;
    chassis.castShadow = true;
    innerBody.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 1.8), glassMat);
    cabin.position.set(0, 0.65, -0.2);
    cabin.castShadow = true;
    innerBody.add(cabin);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.2), bodyMat);
    hood.position.set(0, 0.38, 1.3);
    hood.castShadow = true;
    innerBody.add(hood);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.4), carbonMat);
    splitter.position.set(0, 0.2, 1.95);
    innerBody.add(splitter);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.45), carbonMat);
    wing.position.set(0, 0.85, -1.8);
    wing.castShadow = true;

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.12), carbonMat);
    postL.position.set(-0.6, 0.68, -1.8);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.12), carbonMat);
    postR.position.set(0.6, 0.68, -1.8);
    innerBody.add(wing, postL, postR);

    frontLeftWheel = createProceduralWheel(customization.accentColor, 0.38, 0.32);
    frontLeftWheel.position.set(-0.95, 0.38, 1.25);
    frontRightWheel = createProceduralWheel(customization.accentColor, 0.38, 0.32);
    frontRightWheel.position.set(0.95, 0.38, 1.25);
    rearLeftWheel = createProceduralWheel(customization.accentColor, 0.38, 0.32);
    rearLeftWheel.position.set(-0.95, 0.38, -1.25);
    rearRightWheel = createProceduralWheel(customization.accentColor, 0.38, 0.32);
    rearRightWheel.position.set(0.95, 0.38, -1.25);
  } else if (modelType === 'bike') {
    isTwoWheeled = true;
    const bikeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 2.2), bodyMat);
    bikeFrame.position.set(0, 0.65, 0);
    bikeFrame.castShadow = true;
    innerBody.add(bikeFrame);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 8), accentMat);
    tank.rotateX(Math.PI / 2);
    tank.position.set(0, 0.95, 0.2);
    innerBody.add(tank);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), chromeMat);
    bar.position.set(0, 1.05, 0.7);
    innerBody.add(bar);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), glassMat);
    visor.position.set(0, 1.15, 0.85);
    innerBody.add(visor);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 })
    );
    helmet.position.set(0, 1.35, -0.1);

    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.7), carbonMat);
    riderTorso.position.set(0, 0.95, -0.2);
    innerBody.add(helmet, riderTorso);

    frontLeftWheel = createProceduralWheel(customization.accentColor, 0.42, 0.22);
    frontLeftWheel.position.set(0, 0.42, 1.2);
    rearLeftWheel = createProceduralWheel(customization.accentColor, 0.42, 0.26);
    rearLeftWheel.position.set(0, 0.42, -1.1);
    frontRightWheel = new THREE.Group();
    rearRightWheel = new THREE.Group();
  } else if (modelType === 'sedan') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.45, 4.0), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    innerBody.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 2.2), glassMat);
    cabin.position.set(0, 0.85, -0.2);
    cabin.castShadow = true;
    innerBody.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.05, 1.6), bodyMat);
    roof.position.set(0, 1.1, -0.2);
    innerBody.add(roof);

    const grill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.05), chromeMat);
    grill.position.set(0, 0.45, 2.02);
    innerBody.add(grill);

    frontLeftWheel = createProceduralWheel(customization.accentColor, 0.36, 0.28);
    frontLeftWheel.position.set(-0.95, 0.36, 1.2);
    frontRightWheel = createProceduralWheel(customization.accentColor, 0.36, 0.28);
    frontRightWheel.position.set(0.95, 0.36, 1.2);
    rearLeftWheel = createProceduralWheel(customization.accentColor, 0.36, 0.28);
    rearLeftWheel.position.set(-0.95, 0.36, -1.2);
    rearRightWheel = createProceduralWheel(customization.accentColor, 0.36, 0.28);
    rearRightWheel.position.set(0.95, 0.36, -1.2);
  } else if (modelType === 'suv') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.6, 4.1), bodyMat);
    body.position.y = 0.58;
    body.castShadow = true;
    innerBody.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.6), glassMat);
    cabin.position.set(0, 1.12, -0.2);
    cabin.castShadow = true;
    innerBody.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 2.3), bodyMat);
    roof.position.set(0, 1.45, -0.2);
    innerBody.add(roof);

    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.0), chromeMat);
    railL.position.set(-0.7, 1.52, -0.2);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.0), chromeMat);
    railR.position.set(0.7, 1.52, -0.2);
    innerBody.add(railL, railR);

    frontLeftWheel = createProceduralWheel(customization.accentColor, 0.44, 0.34);
    frontLeftWheel.position.set(-1.0, 0.44, 1.25);
    frontRightWheel = createProceduralWheel(customization.accentColor, 0.44, 0.34);
    frontRightWheel.position.set(1.0, 0.44, 1.25);
    rearLeftWheel = createProceduralWheel(customization.accentColor, 0.44, 0.34);
    rearLeftWheel.position.set(-1.0, 0.44, -1.25);
    rearRightWheel = createProceduralWheel(customization.accentColor, 0.44, 0.34);
    rearRightWheel.position.set(1.0, 0.44, -1.25);
  }

  innerBody.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), headMat);
  hl1.position.set(-0.5, 0.45, 1.9);
  const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), headMat);
  hl2.position.set(0.5, 0.45, 1.9);
  const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), tailMat);
  tl1.position.set(-0.5, 0.45, -1.9);
  const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), tailMat);
  tl2.position.set(0.5, 0.45, -1.9);
  innerBody.add(hl1, hl2, tl1, tl2);

  const headlightL = new THREE.SpotLight(0xffffff, 1.8, 35, Math.PI / 6, 0.4);
  headlightL.position.set(-0.5, 0.45, 1.8);
  headlightL.target.position.set(-0.5, 0, 18);

  const headlightR = new THREE.SpotLight(0xffffff, 1.8, 35, Math.PI / 6, 0.4);
  headlightR.position.set(0.5, 0.45, 1.8);
  headlightR.target.position.set(0.5, 0, 18);
  innerBody.add(headlightL, headlightL.target, headlightR, headlightR.target);

  const flameGeom = new THREE.ConeGeometry(0.14, 0.8, 12);
  flameGeom.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  const boostFlameLeft = new THREE.Mesh(flameGeom, flameMat);
  boostFlameLeft.position.set(-0.35, 0.3, -2.2);
  boostFlameLeft.scale.set(0.001, 0.001, 0.001);

  const boostFlameRight = new THREE.Mesh(flameGeom, flameMat);
  boostFlameRight.position.set(0.35, 0.3, -2.2);
  boostFlameRight.scale.set(0.001, 0.001, 0.001);
  innerBody.add(boostFlameLeft, boostFlameRight);

  const underglowLight = new THREE.PointLight(new THREE.Color(customization.neonColor), 2.2, 6);
  underglowLight.position.set(0, 0.15, 0);
  innerBody.add(underglowLight);

  const shadowTex = createContactShadowTexture();
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 4.4),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.03, 0);
  carGroup.add(shadowMesh);

  return {
    group: carGroup,
    innerBody,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    boostFlameLeft,
    boostFlameRight,
    headlightL,
    headlightR,
    underglowLight,
    contactShadow: shadowMesh,
    isTwoWheeled,
    materials: {
      body: bodyMat,
      accent: accentMat,
      neon: neonMat,
    },
  };
}

export function updateCarVisuals(
  visuals: CarVisuals,
  steerAngle: number,
  wheelPitch: number,
  isBoosting: boolean,
  isDrifting: boolean
) {
  if (visuals.frontLeftWheel.children[0]) {
    visuals.frontLeftWheel.children[0].rotation.x = wheelPitch;
  }
  if (visuals.rearLeftWheel.children[0]) {
    visuals.rearLeftWheel.children[0].rotation.x = wheelPitch;
  }
  if (!visuals.isTwoWheeled) {
    if (visuals.frontRightWheel.children[0]) {
      visuals.frontRightWheel.children[0].rotation.x = wheelPitch;
    }
    if (visuals.rearRightWheel.children[0]) {
      visuals.rearRightWheel.children[0].rotation.x = wheelPitch;
    }
  }

  visuals.frontLeftWheel.rotation.y = steerAngle * 0.7;
  if (!visuals.isTwoWheeled) {
    visuals.frontRightWheel.rotation.y = steerAngle * 0.7;
  }

  if (visuals.isTwoWheeled) {
    visuals.innerBody.rotation.z = -steerAngle * 0.45;
  } else {
    visuals.innerBody.rotation.z = -steerAngle * 0.08;
  }

  if (isBoosting) {
    const flameScale = 1.0 + Math.random() * 0.4;
    visuals.boostFlameLeft.scale.set(flameScale, flameScale, flameScale * 1.5);
    visuals.boostFlameRight.scale.set(flameScale, flameScale, flameScale * 1.5);
    visuals.boostFlameLeft.visible = true;
    visuals.boostFlameRight.visible = true;
  } else {
    visuals.boostFlameLeft.visible = false;
    visuals.boostFlameRight.visible = false;
  }

  visuals.underglowLight.intensity = isDrifting ? 3.5 : 2.0;
}
