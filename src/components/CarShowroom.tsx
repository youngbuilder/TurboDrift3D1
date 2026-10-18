/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildProceduralCar, updateCarVisuals } from '../game/carModel';
import { CarCustomization } from '../types/game';

interface CarShowroomProps {
  customization: CarCustomization;
}

export const CarShowroom: React.FC<CarShowroomProps> = ({ customization }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth || 320, 320);
    const height = Math.max(container.clientHeight || 260, 260);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.5, 2.2, 5.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const ambientLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const floorGeom = new THREE.CylinderGeometry(3.2, 3.4, 0.15, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeom = new THREE.RingGeometry(3.1, 3.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(customization.neonColor),
      side: THREE.DoubleSide,
    });
    const neonRing = new THREE.Mesh(ringGeom, ringMat);
    neonRing.rotation.x = -Math.PI / 2;
    neonRing.position.y = 0.005;
    scene.add(neonRing);

    const carVisuals = buildProceduralCar(customization);
    scene.add(carVisuals.group);

    let isDragging = false;
    let prevMouseX = 0;
    let targetRotationY = 0.8;
    let currentRotationY = 0.8;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      targetRotationY += deltaX * 0.01;
      prevMouseX = e.clientX;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let prevTouchX = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevTouchX = e.touches[0].clientX;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevTouchX;
      targetRotationY += deltaX * 0.01;
      prevTouchX = e.touches[0].clientX;
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 240);
        const h = Math.max(entry.contentRect.height, 200);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (!isDragging) {
        targetRotationY += delta * 0.35;
      }
      currentRotationY = THREE.MathUtils.damp(currentRotationY, targetRotationY, 10, delta);
      carVisuals.group.rotation.y = currentRotationY;
      updateCarVisuals(carVisuals, 0, 0, false, false);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, [customization]);

  return (
    <div className="relative w-full h-full min-h-[260px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-950/70 shadow-2xl flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full min-h-[260px] cursor-grab active:cursor-grabbing" />
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700/60 text-[11px] text-cyan-300 backdrop-blur-sm pointer-events-none flex items-center gap-1.5">
        <span>드래그하여 360도 회전</span>
      </div>
    </div>
  );
};
