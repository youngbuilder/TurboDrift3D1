/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Camera,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Flag,
  Share2,
  Check,
  LogOut,
  AlertTriangle,
  Compass,
  Users,
  Move,
} from 'lucide-react';
import { sound } from '../game/audio';
import { BotRacer, VehicleState } from '../game/physics';
import { ItemType, PlayerInfo, TeamId } from '../types/game';

interface HUDProps {
  vehicleState: VehicleState | null;
  totalLaps: number;
  totalRacers: number;
  roomId: string;
  cameraMode: number;
  playerTeam?: TeamId;
  onCycleCamera: () => void;
  onResetCar: () => void;
  onUseItem: () => void;
  onForfeit: () => void;
  onSendQuickChat: (emoji: string, text: string) => void;
  onTouchInput?: (input: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    drift: boolean;
    item: boolean;
  }) => void;
  isDarkMode: boolean;
  graphicsQuality: number;
  onGraphicsQualityChange: (q: number) => void;
  aiBotsCount: number;
  playerInfo: PlayerInfo;
  peerPlayers: Map<string, PlayerInfo>;
  bots: BotRacer[];
}

export const HUD: React.FC<HUDProps> = ({
  vehicleState,
  totalLaps,
  totalRacers,
  roomId,
  cameraMode,
  playerTeam = 'none',
  onCycleCamera,
  onResetCar,
  onUseItem,
  onForfeit,
  onSendQuickChat,
  onTouchInput,
  isDarkMode,
  graphicsQuality,
  onGraphicsQualityChange,
  aiBotsCount,
  playerInfo,
  peerPlayers,
  bots,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isSoundMuted());
  const [isMusicMuted, setIsMusicMuted] = useState(sound.isMusicDisabled());
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [isMapHidden, setIsMapHidden] = useState(false);

  // Free draggable UI offset for minimap/leaderboard
  const [minimapOffset, setMinimapOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMinimapPointerDown = (e: React.PointerEvent) => {
    setIsDraggingMinimap(true);
    dragStartRef.current = { x: e.clientX - minimapOffset.x, y: e.clientY - minimapOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMinimapPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingMinimap) return;
    setMinimapOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMinimapPointerUp = (e: React.PointerEvent) => {
    setIsDraggingMinimap(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const [touchState, setTouchState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    item: false,
  });

  const updateTouch = (key: keyof typeof touchState, value: boolean) => {
    const next = { ...touchState, [key]: value };
    setTouchState(next);
    if (onTouchInput) onTouchInput(next);
  };

  const speed = vehicleState ? Math.max(0, Math.round(vehicleState.speedKmh)) : 0;
  const rank = vehicleState?.rank || 1;
  const currentLap = vehicleState?.currentLap || 1;
  const currentItem = vehicleState?.currentItem;
  const driftLevel = vehicleState?.driftBoostLevel || 0;
  const isDrifting = vehicleState?.isDrifting || false;
  const isFinished = vehicleState?.isFinished || false;

  const gear = speed === 0 ? 'N' : speed < 45 ? '1' : speed < 90 ? '2' : speed < 140 ? '3' : speed < 190 ? '4' : '5';
  const cameraNames = ['3인칭 뷰', '1인칭 뷰'];

  const getItemLabel = (item: ItemType) => {
    switch (item) {
      case 'nitro':
        return { name: '니트로', icon: '🚀' };
      case 'shield':
        return { name: '에너지 쉴드', icon: '🛡️' };
      case 'trap':
        return { name: 'EMP 지뢰', icon: '⚠️' };
      case 'rocket':
        return { name: '유도 미사일', icon: '🎯' };
      default:
        return { name: '아이템', icon: '🎁' };
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-3 md:p-6"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between w-full pointer-events-auto gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className={`${isDarkMode ? 'bg-slate-900/90' : 'bg-white'} border ${isDarkMode ? 'border-cyan-500/40' : 'border-cyan-300/40'} rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-black italic text-cyan-400 tracking-wider text-xs md:text-sm">
                TURBO DRIFT
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>방코드:</span>
              <span className="font-mono font-bold text-amber-500 text-xs tracking-wider">{roomId}</span>
            </div>
          </div>

          <button
            onClick={() => setShowPlayerList(!showPlayerList)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-lg backdrop-blur-md transition-all"
            title="레이서 순위"
          >
            <Users size={14} />
            <span>순위</span>
          </button>

          <button
            onClick={() => setIsMapHidden(!isMapHidden)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-lg backdrop-blur-md transition-all"
            title="미니맵 토글"
          >
            <Compass size={14} />
            <span>{isMapHidden ? '미니맵 켜기' : '미니맵 숨기기'}</span>
          </button>

          {playerTeam !== 'none' && (
            <div
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                playerTeam === 'red'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-blue-950/80 border-blue-500 text-blue-300'
              }`}
            >
              <span>팀: {playerTeam === 'red' ? '레드 팀' : '블루 팀'}</span>
            </div>
          )}

          <button
            onClick={() => setShowForfeitModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-slate-900/90 hover:bg-rose-950/80 border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-200' : 'bg-white hover:bg-rose-100 border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700'} text-xs font-bold shadow-lg transition-all active:scale-95`}
            title="포기하고 나가기"
          >
            <LogOut size={13} className="text-rose-500" />
            <span>포기</span>
          </button>

          {isFinished && (
            <div className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-black text-xs backdrop-blur-md animate-pulse">
              결승선 통과 완료!
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-700/60 rounded-xl p-1 backdrop-blur-md">
            {['🔥', '👍', '😎', '🎉'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendQuickChat(emoji, emoji)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-cyan-500/30 text-xs font-bold flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
              <Flag size={11} className="text-amber-400" />
              LAP
            </div>
            <div className="font-black text-white text-base md:text-lg tracking-wider">
              {Math.min(currentLap, totalLaps)} <span className="text-slate-500 text-xs">/ {totalLaps}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-300/40 rounded-xl px-3.5 py-1.5 shadow-xl backdrop-blur-md text-center min-w-[70px]">
            <div className="text-[9px] font-bold text-amber-200 uppercase tracking-widest">RANK</div>
            <div className="font-black text-white text-xl md:text-2xl leading-none mt-0.5">
              {rank}
              <span className="text-[11px] text-amber-200/80 ml-0.5 font-semibold">/{totalRacers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimap & Permanent Leaderboard (Freely Draggable Anywhere!) */}
      <div
        className={`absolute top-20 right-4 z-30 pointer-events-auto flex flex-col gap-2.5 w-52 transition-opacity duration-300 cursor-move ${isMapHidden ? 'translate-x-60 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}
        style={{ transform: `translate(${minimapOffset.x}px, ${minimapOffset.y}px)` }}
        onPointerDown={handleMinimapPointerDown}
        onPointerMove={handleMinimapPointerMove}
        onPointerUp={handleMinimapPointerUp}
      >
        <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-2.5 backdrop-blur-md w-full h-36 flex flex-col items-center justify-center relative shadow-xl">
          <div className="absolute top-1 left-2 text-[9px] font-bold text-cyan-400 flex items-center gap-1">
            <Compass size={11} /> 서킷 미니맵 <Move size={10} className="ml-1 opacity-70" />
          </div>
          <div className="relative w-28 h-28 rounded-full border border-cyan-500/30 bg-slate-900/80 flex items-center justify-center overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#06b6d4" strokeWidth="4" strokeDasharray="6 4" />
            </svg>
            {/* Player position */}
            {(() => {
              const t = (vehicleState?.trackT || 0) % 1;
              const angle = t * Math.PI * 2 - Math.PI / 2;
              return (
                <div
                  className="absolute w-3 h-3 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_10px_#06b6d4] z-20 transition-all duration-75"
                  style={{ left: `calc(50% + ${Math.cos(angle) * 36}px - 6px)`, top: `calc(50% + ${Math.sin(angle) * 36}px - 6px)` }}
                  title="내 차량"
                />
              ) as React.ReactNode;
            })()}
            {/* AI Bots positions */}
            {bots.map((b) => {
              const t = (b.trackT || 0) % 1;
              const angle = t * Math.PI * 2 - Math.PI / 2;
              return (
                <div
                  key={b.id}
                  className="absolute w-2 h-2 rounded-full bg-rose-500 border border-white z-10 transition-all duration-75"
                  style={{ left: `calc(50% + ${Math.cos(angle) * 34}px - 4px)`, top: `calc(50% + ${Math.sin(angle) * 34}px - 4px)` }}
                  title={b.name}
                />
              );
            })}
            {/* Peer players positions */}
            {Array.from(peerPlayers.values()).map((p) => {
              const t = (p.progress || 0) % 1;
              const angle = t * Math.PI * 2 - Math.PI / 2;
              return (
                <div
                  key={p.id}
                  className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 border border-white z-15 transition-all duration-75"
                  style={{ left: `calc(50% + ${Math.cos(angle) * 35}px - 5px)`, top: `calc(50% + ${Math.sin(angle) * 35}px - 5px)` }}
                  title={p.name}
                />
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950/95 border border-cyan-500/50 rounded-2xl p-3 backdrop-blur-xl w-full shadow-2xl">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800 text-xs font-bold text-cyan-400">
            <span>실시간 순위</span>
            <span>LAP {currentLap}/{totalLaps}</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
            <div className="flex justify-between items-center px-2 py-1 rounded bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> 1. {playerInfo.name} (나)</span>
              <span>{rank}위</span>
            </div>
            {Array.from(peerPlayers.values()).map((p, idx) => (
              <div key={p.id} className="flex justify-between items-center px-2 py-1 rounded bg-slate-900 text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> {idx + 2}. {p.name}</span>
                <span>Lap {p.lap}</span>
              </div>
            ))}
            {bots.map((bot, idx) => (
              <div key={bot.id} className="flex justify-between items-center px-2 py-1 rounded bg-slate-900/80 text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> {peerPlayers.size + idx + 2}. {bot.name}</span>
                <span>Lap {bot.lap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="self-center flex flex-col items-center pointer-events-none">
        {isDrifting && !isFinished && (
          <div className="mb-4 flex flex-col items-center animate-bounce">
            <div
              className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border backdrop-blur-md shadow-lg ${
                driftLevel === 3
                  ? 'bg-purple-950/90 text-purple-300 border-purple-400 shadow-purple-500/50'
                  : driftLevel === 2
                  ? 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-amber-500/50'
                  : 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-cyan-500/50'
              }`}
            >
              {driftLevel === 3
                ? '⚡ 울트라 터보 준비 완료! (3단계)'
                : driftLevel === 2
                ? '🔥 슈퍼 터보 충전 중...'
                : '💨 미니 터보 충전 중...'}
            </div>
          </div>
        )}
      </div>

      {!isFinished && (
        <div className="flex justify-between items-end w-full pointer-events-auto pb-12 px-2">
          <div className="flex gap-3 bg-slate-950/40 p-2.5 rounded-3xl backdrop-blur-md border border-cyan-500/20 shadow-lg">
            <button
              onPointerDown={() => updateTouch('left', true)}
              onPointerUp={() => updateTouch('left', false)}
              onPointerCancel={() => updateTouch('left', false)}
              onPointerLeave={() => updateTouch('left', false)}
              className={`w-14 h-14 rounded-2xl font-black text-lg shadow-md transition-all ${
                touchState.left ? 'bg-cyan-500 text-white scale-95 shadow-cyan-500/50' : 'bg-slate-900/50 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              ◀
            </button>
            <button
              onPointerDown={() => updateTouch('right', true)}
              onPointerUp={() => updateTouch('right', false)}
              onPointerCancel={() => updateTouch('right', false)}
              onPointerLeave={() => updateTouch('right', false)}
              className={`w-14 h-14 rounded-2xl font-black text-lg shadow-md transition-all ${
                touchState.right ? 'bg-cyan-500 text-white scale-95 shadow-cyan-500/50' : 'bg-slate-900/50 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              ▶
            </button>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {currentItem && (
              <button
                onClick={onUseItem}
                className="w-16 h-12 rounded-2xl bg-amber-500/80 active:scale-95 text-white font-black text-xs flex items-center justify-center shadow-lg backdrop-blur-md border border-amber-400/40"
              >
                {getItemLabel(currentItem).icon} 사용
              </button>
            )}
            <div className="flex gap-2 bg-slate-950/40 p-2.5 rounded-3xl backdrop-blur-md border border-cyan-500/20 shadow-lg">
              <button
                onPointerDown={() => updateTouch('drift', true)}
                onPointerUp={() => updateTouch('drift', false)}
                onPointerCancel={() => updateTouch('drift', false)}
                onPointerLeave={() => updateTouch('drift', false)}
                className={`w-14 h-14 rounded-2xl font-black text-xs shadow-md transition-all ${
                  touchState.drift ? 'bg-purple-600 text-white scale-95 shadow-purple-500/50' : 'bg-slate-900/50 text-purple-300 border border-purple-500/30'
                }`}
              >
                DRIFT
              </button>
              <button
                onPointerDown={() => updateTouch('backward', true)}
                onPointerUp={() => updateTouch('backward', false)}
                onPointerCancel={() => updateTouch('backward', false)}
                onPointerLeave={() => updateTouch('backward', false)}
                className={`w-14 h-14 rounded-2xl font-black text-xs shadow-md transition-all ${
                  touchState.backward ? 'bg-rose-600 text-white scale-95 shadow-rose-500/50' : 'bg-slate-900/50 text-rose-300 border border-rose-500/30'
                }`}
              >
                후진
              </button>
              <button
                onPointerDown={() => updateTouch('forward', true)}
                onPointerUp={() => updateTouch('forward', false)}
                onPointerCancel={() => updateTouch('forward', false)}
                onPointerLeave={() => updateTouch('forward', false)}
                className={`w-14 h-14 rounded-2xl font-black text-xs shadow-md transition-all ${
                  touchState.forward ? 'bg-cyan-500 text-white scale-95 shadow-cyan-500/50' : 'bg-slate-900/50 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                악셀
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="self-center pointer-events-auto flex flex-col items-center max-w-[940px] w-full">
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1 px-3 py-1 rounded-full bg-slate-900/85 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp size={14} className="text-cyan-400" />
              <span>HUD 컨트롤 펼치기</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} className="text-cyan-400" />
              <span>HUD 컨트롤 접기</span>
            </>
          )}
        </button>
        <div
          className={`w-full bg-slate-950/85 border border-cyan-500/30 rounded-2xl p-3 md:p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            isDockCollapsed ? 'translate-y-28 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative flex items-baseline gap-1 bg-black/30 px-3 py-1 rounded-lg backdrop-blur-sm">
                <span className="font-mono font-black text-3xl md:text-5xl text-white tracking-tighter">
                  {speed}
                </span>
                <span className="font-bold text-xs md:text-sm text-cyan-400">KM/H</span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-slate-700/50 text-center">
                <div className="text-[9px] font-semibold text-slate-400">GEAR</div>
                <div className="font-mono font-bold text-amber-400 text-sm md:text-base leading-none mt-0.5">
                  {gear}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentItem ? (
                <button
                  onClick={onUseItem}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/80 to-amber-600/80 text-white font-bold text-xs md:text-sm shadow-lg backdrop-blur-sm"
                >
                  <span className="text-xl">{getItemLabel(currentItem).icon}</span>
                  <span>{getItemLabel(currentItem).name} 사용 (키: [F])</span>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-2 bg-slate-900/90 rounded-2xl border-2 border-purple-500/60 backdrop-blur-md min-w-[180px] md:min-w-[210px] shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                  <div className="flex justify-between w-full text-[11px] text-purple-300 font-black mb-1.5 tracking-wider">
                    <span>⚡ DRIFT GAUGE</span>
                    <span>{driftLevel > 0 ? `${driftLevel}단계 터보 준비!` : `${Math.round(Math.min(100, ((vehicleState?.driftChargeTime || 0) / 2.4) * 100))}%`}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-purple-500/80 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        driftLevel === 3
                          ? 'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 animate-pulse shadow-[0_0_15px_#a855f7]'
                          : driftLevel === 2
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_#f97316]'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_#06b6d4]'
                      }`}
                      style={{ width: `${Math.min(100, ((vehicleState?.driftChargeTime || 0) / 2.4) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={onCycleCamera}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-200 text-xs backdrop-blur-sm transition-colors"
                title="카메라 전환: [C]"
              >
                <Camera size={14} className="text-cyan-400" />
                <span className="hidden sm:inline">{cameraNames[cameraMode]}</span>
              </button>

              <button
                onClick={() => {
                  const muted = sound.toggleMute();
                  setIsMuted(muted);
                }}
                className={`p-2 rounded-lg border transition-colors ${
                  isMuted ? 'bg-rose-950/40 border-rose-800 text-rose-400' : 'bg-black/40 border-slate-700 text-slate-200'
                }`}
                title="음소거 토글"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                onClick={() => {
                  const m = sound.toggleMusic();
                  setIsMusicMuted(m);
                }}
                className={`p-2 rounded-lg border transition-colors ${
                  isMusicMuted ? 'bg-black/40 border-slate-800 text-slate-500' : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                }`}
                title="BGM 토글"
              >
                <Music size={14} />
              </button>

              <div className="flex flex-col items-center gap-1 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
                <span className="text-[9px] text-slate-400">그래픽: {graphicsQuality}%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={graphicsQuality}
                  onChange={(e) => onGraphicsQualityChange(Number(e.target.value))}
                  className="w-16 accent-cyan-500 cursor-pointer"
                />
              </div>

              {!isFinished && (
                <button
                  onClick={onResetCar}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                  title="차량 위치 리셋: [R]"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForfeitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pointer-events-auto backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-black text-white mb-1">정말 레이스를 포기하시겠습니까?</h3>
            <p className="text-xs text-slate-400 mb-5">로비로 즉시 이동합니다.</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowForfeitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                계속 하기
              </button>
              <button
                onClick={() => {
                  setShowForfeitModal(false);
                  onForfeit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
              >
                포기하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
