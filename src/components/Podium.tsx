/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
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
  const [countdown, setCountdown] = useState<number>(10);

  useEffect(() => {
    const duration = 4.0 * 1000;
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

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReturnToLobby();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    if (a.place && b.place) return a.place - b.place;
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    return b.progress - a.progress;
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Bright stadium background, not pitch black
    scene.fog = new THREE.FogExp2(0x1e293b, 0.008);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 9.5);
    camera.lookAt(0, 1.0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Stadium ground platform
    const groundGeom = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Arrange cars symmetrically: 1st place in center-front, others arrayed outward on both sides with decreasing rank
    const carGroups: THREE.Group[] = [];
    const n = sortedResults.length;

    sortedResults.forEach((res, index) => {
      const custom: CarCustomization = {
        model: res.carModel || 'sport',
        color: res.carColor || '#ef4444',
        accentColor: res.accentColor || '#ffffff',
        neonColor: res.neonColor || '#06b6d4',
      };
      const v = buildProceduralCar(custom);

      // Symmetrical V-shape / Arc placement:
      // Index 0 (1st place) is dead center in front.
      // Index 1 (2nd), Index 2 (3rd), etc. placed symmetrically left and right.
      let x = 0;
      let z = 0;
      if (index === 0) {
        x = 0;
        z = 0; // Front & Center
      } else {
        const side = index % 2 === 1 ? 1 : -1;
        const rankPair = Math.ceil(index / 2);
        x = side * rankPair * 2.2;
        z = -rankPair * 1.2; // slightly behind 1st place
      }

      v.group.position.set(x, 0, z);
      v.group.rotation.y = 0.25;
      v.group.scale.set(0.9, 0.9, 0.9);
      scene.add(v.group);
      carGroups.push(v.group);
    });

    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      carGroups.forEach((g, idx) => {
        g.position.y = Math.sin(time * 2.5 + idx) * 0.025;
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
    if (!ms) return 'DNF';
    let duration = ms;
    if (ms > 1000000000000) {
      duration = ms % 300000;
    }
    const totalSec = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const millis = Math.floor((duration % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-between p-4 md:p-6 overflow-y-auto select-none pointer-events-none backdrop-blur-sm">
      {/* 3D Stadium Car Showcase Lineup Background */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto z-0" />

      {/* Top Banner */}
      <div className="relative z-10 flex flex-col items-center mt-2 pointer-events-auto">
        <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tight drop-shadow-[0_0_25px_rgba(6,182,212,0.9)]">
          🏆 최종 순위표
        </h1>
      </div>

      <div className="relative z-10 flex-grow pointer-events-none min-h-[60px]" />

      {/* Bottom Info & Large Leaderboard */}
      <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-2xl mx-auto pointer-events-auto pb-4">
        <div className="w-full bg-slate-950/95 border-2 border-cyan-500/50 rounded-3xl p-4 md:p-5 shadow-[0_0_40px_rgba(6,182,212,0.4)] backdrop-blur-xl max-h-80 overflow-y-auto">
          <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Flag size={16} className="text-cyan-400" /> 최종 경기 순위 (Player & AI)
            </span>
            <span className="text-xs text-slate-400">총 {sortedResults.length}명 완주 및 순위</span>
          </h4>
          <div className="space-y-1.5">
            {sortedResults.map((player, idx) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs md:text-sm transition-all ${
                  player.id === currentPlayerId
                    ? 'bg-cyan-500/30 border-cyan-400 text-white font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-[1.01]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 text-center font-mono font-black text-sm md:text-base ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                  </span>
                  <span
                    className="w-4 h-4 rounded-full border border-white/60 shadow-sm"
                    style={{ backgroundColor: player.carColor }}
                  />
                  <span className="font-bold truncate max-w-[150px] md:max-w-[260px]">{player.name}</span>
                  {player.id === currentPlayerId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-black">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs md:text-sm font-semibold text-cyan-300">
                  <Clock size={13} className="text-cyan-400" />
                  <span>{player.finished ? formatTime(player.finishTime) : `Lap ${Math.min(player.lap || 1, 2)}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10 seconds exit notice banner */}
        <div className="w-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl text-center text-sm md:text-base border border-cyan-200 animate-pulse tracking-wide">
          ⏳ 10초 뒤에 자동으로 로비로 나갑니다 ({countdown}초)
        </div>

        <div className="flex items-center gap-3 w-full justify-center">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
          >
            <ArrowRight size={16} /> 지금 즉시 나가기 (로비 복귀)
          </button>
          {isHost && (
            <button
              onClick={onRematch}
              className="flex-1 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
            >
              <RotateCcw size={16} /> 다시 시작 (재경기)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
