/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Flag, Clock, Award, Star } from 'lucide-react';
import { PlayerInfo, CarCustomization } from '../types/game';
import { buildProceduralCar } from '../game/carModel';

interface PodiumProps {
  results: PlayerInfo[];
  currentPlayerId: string;
  isHost: boolean;
  onReturnToLobby: () => void;
  onRematch: () => void;
  isDarkMode: boolean;
}

export const Podium: React.FC<PodiumProps> = ({
  results,
  currentPlayerId,
  isHost,
  onReturnToLobby,
  onRematch,
  isDarkMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 4.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors: ['#facc15', '#38bdf8', '#ec4899', '#22c55e', '#a855f7'],
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors: ['#facc15', '#38bdf8', '#ec4899', '#22c55e', '#a855f7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    if (a.place && b.place) return a.place - b.place;
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    return b.progress - a.progress;
  });

  const winner = sortedResults[0];
  const second = sortedResults[1];
  const third = sortedResults[2];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 9.0);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const ambientLight = new THREE.HemisphereLight(0x38bdf8, 0x050811, 1.2);
    scene.add(ambientLight);

    const spotGold = new THREE.SpotLight(0xfacc15, 4.5, 30, Math.PI / 4, 0.5);
    spotGold.position.set(0, 10, 5);
    spotGold.castShadow = true;
    scene.add(spotGold);

    // Podium Pedestals
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });

    // 1st Place (Center)
    const p1Geom = new THREE.BoxGeometry(2.4, 2.2, 2.4);
    const p1Mesh = new THREE.Mesh(p1Geom, pedestalMat);
    p1Mesh.position.set(0, 1.1, 0);
    p1Mesh.receiveShadow = true;
    scene.add(p1Mesh);

    // 2nd Place (Left)
    const p2Geom = new THREE.BoxGeometry(2.2, 1.5, 2.2);
    const p2Mesh = new THREE.Mesh(p2Geom, pedestalMat);
    p2Mesh.position.set(-2.8, 0.75, -0.5);
    p2Mesh.receiveShadow = true;
    scene.add(p2Mesh);

    // 3rd Place (Right)
    const p3Geom = new THREE.BoxGeometry(2.2, 0.9, 2.2);
    const p3Mesh = new THREE.Mesh(p3Geom, pedestalMat);
    p3Mesh.position.set(2.8, 0.45, -0.5);
    p3Mesh.receiveShadow = true;
    scene.add(p3Mesh);

    const carGroups: THREE.Group[] = [];

    if (winner) {
      const custom: CarCustomization = {
        model: winner.carModel || 'sport',
        color: winner.carColor || '#facc15',
        accentColor: winner.accentColor || '#ffffff',
        neonColor: winner.neonColor || '#facc15',
      };
      const v = buildProceduralCar(custom);
      v.group.position.set(0, 2.2, 0);
      v.group.scale.set(0.9, 0.9, 0.9);
      scene.add(v.group);
      carGroups.push(v.group);
    }

    if (second) {
      const custom: CarCustomization = {
        model: second.carModel || 'sport',
        color: second.carColor || '#94a3b8',
        accentColor: second.accentColor || '#ffffff',
        neonColor: second.neonColor || '#38bdf8',
      };
      const v = buildProceduralCar(custom);
      v.group.position.set(-2.8, 1.5, -0.5);
      v.group.scale.set(0.85, 0.85, 0.85);
      scene.add(v.group);
      carGroups.push(v.group);
    }

    if (third) {
      const custom: CarCustomization = {
        model: third.carModel || 'sport',
        color: third.carColor || '#b45309',
        accentColor: third.accentColor || '#ffffff',
        neonColor: third.neonColor || '#f97316',
      };
      const v = buildProceduralCar(custom);
      v.group.position.set(2.8, 0.9, -0.5);
      v.group.scale.set(0.85, 0.85, 0.85);
      scene.add(v.group);
      carGroups.push(v.group);
    }

    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      carGroups.forEach((g, idx) => {
        g.rotation.y = time * 0.5 + idx * 2.0;
      });

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [results]);

  const formatTime = (ms: number) => {
    if (!ms) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 md:p-6 overflow-y-auto select-none">
      {/* 3D Podium Canvas Background */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Top Header */}
      <div className="relative z-10 text-center mt-2 pointer-events-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-xs md:text-sm tracking-widest uppercase mb-1.5 shadow-2xl backdrop-blur-md">
          <Award size={16} className="text-amber-400" />
          VICTORY CEREMONY
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tight drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
          챔피언 시상대 (PODIUM)
        </h1>
      </div>

      {/* Center 3D Showcase Area (transparent overlay for layout) */}
      <div className="relative z-10 flex-grow pointer-events-none min-h-[220px]" />

      {/* Bottom Info & Buttons */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-xl mx-auto pointer-events-auto">
        <div className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl max-h-44 overflow-y-auto">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flag size={13} className="text-cyan-400" /> 최종 순위 결과
            </span>
            <span className="text-[10px] text-slate-400">총 {sortedResults.length}명 완주</span>
          </h4>
          <div className="space-y-1.5">
            {sortedResults.map((player, idx) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                  player.id === currentPlayerId
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-mono font-bold text-amber-400">
                    {idx + 1}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: player.carColor }}
                  />
                  <span className="truncate max-w-[140px] md:max-w-[220px]">{player.name}</span>
                  {player.id === currentPlayerId && (
                    <span className="text-[9px] px-1.5 rounded bg-cyan-500/20 text-cyan-300">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                  <Clock size={11} className="text-cyan-400" />
                  <span>{player.finished ? formatTime(player.finishTime) : '완주'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full justify-center">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <ArrowRight size={16} /> 로비로 나가기
          </button>
          {isHost && (
            <button
              onClick={onRematch}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/40"
            >
              <RotateCcw size={16} /> 재경기 (Rematch)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
