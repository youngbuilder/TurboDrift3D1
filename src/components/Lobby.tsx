/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Play,
  Check,
  Share2,
  Sparkles,
  Flag,
  Car,
  Palette,
  Gauge,
  Zap,
  Compass,
  PlusCircle,
  RefreshCw,
  LogOut,
  Globe,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { CarShowroom } from './CarShowroom';
import { sound } from '../game/audio';
import { TRACK_METADATA } from '../game/tracks';
import {
  AIDifficulty,
  CarCustomization,
  CarModelType,
  GameMode,
  PlayerInfo,
  RoomState,
  RoomSummary,
  TrackId,
  VEHICLE_CONFIGS,
} from '../types/game';

interface LobbyProps {
  roomState: RoomState | null;
  currentPlayer: PlayerInfo | null;
  roomList: RoomSummary[];
  onUpdateProfile: (name: string, customization: CarCustomization, isReady: boolean, team: any) => void;
  onUpdateSettings: (trackId: TrackId, laps: number, bots: number, gameMode: GameMode, aiDifficulty: AIDifficulty) => void;
  onStartRace: () => void;
  onQuickStart: (
    trackId: TrackId,
    customization: CarCustomization,
    nickname: string,
    botsCount?: number,
    difficulty?: AIDifficulty
  ) => void;
  onCreateRoom: (
    roomName: string,
    trackId: TrackId,
    gameMode: GameMode,
    aiDifficulty: AIDifficulty,
    botsCount: number,
    nickname: string,
    customization: CarCustomization
  ) => void;
  onJoinRoom: (roomId: string, name: string, customization: CarCustomization) => void;
  onLeaveRoom: () => void;
  onRefreshRoomList: () => void;
  onSendChat: (emoji: string, text: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  graphicsQuality: number;
  onGraphicsQualityChange: (q: number) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Gold / Amber
  '#3b82f6', // Royal Blue
  '#0f172a', // Midnight Black
  '#f8fafc', // Pearl White
];

export const Lobby: React.FC<LobbyProps> = ({
  roomState,
  currentPlayer,
  roomList,
  onUpdateProfile,
  onUpdateSettings,
  onStartRace,
  onQuickStart,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onRefreshRoomList,
  isDarkMode,
  onToggleDarkMode,
  graphicsQuality,
  onGraphicsQualityChange,
}) => {
  const [nickname, setNickname] = useState(() => '레이서_' + Math.floor(100 + Math.random() * 900));
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('city-downtown');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [aiBotsCount, setAiBotsCount] = useState<number>(4);
  const [newRoomName, setNewRoomName] = useState<string>('스피드 레이싱 방');
  const [customization, setCustomization] = useState<CarCustomization>({
    model: 'sport',
    color: '#ef4444',
    accentColor: '#06b6d4',
    neonColor: '#06b6d4',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isSoundMuted());
  const [isMusicMuted, setIsMusicMuted] = useState(sound.isMusicDisabled());

  const isHost = currentPlayer?.isHost ?? false;
  const currentVehicleStats = VEHICLE_CONFIGS[customization.model] || VEHICLE_CONFIGS.sport;

  const handleModelChange = (model: CarModelType) => {
    const updated = { ...customization, model };
    setCustomization(updated);
    if (currentPlayer) {
      onUpdateProfile(nickname, updated, currentPlayer.isReady, currentPlayer.team);
    }
  };

  const handleColorChange = (key: keyof CarCustomization, color: string) => {
    const updated = { ...customization, [key]: color };
    setCustomization(updated);
    if (currentPlayer) {
      onUpdateProfile(nickname, updated, currentPlayer.isReady, currentPlayer.team);
    }
  };

  const handleReadyToggle = () => {
    if (currentPlayer) {
      onUpdateProfile(nickname, customization, !currentPlayer.isReady, currentPlayer.team);
    }
  };

  const allPlayersReady = roomState
    ? roomState.players.every((p) => p.isReady || p.isHost)
    : false;

  if (!roomState || !currentPlayer) {
    return (
      <div className={`relative min-h-screen w-full flex flex-col justify-between p-3 md:p-6 select-none overflow-x-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto w-full pt-2">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              TURBO DRIFT 3D - 아케이드 레이싱
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-2xl px-3 py-2 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  const muted = sound.toggleMute();
                  setIsMuted(muted);
                }}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isMuted ? 'bg-rose-950/40 border-rose-800 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
                title={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const m = sound.toggleMusic();
                  setIsMusicMuted(m);
                }}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                }`}
                title={isMusicMuted ? 'BGM 켜기' : 'BGM 끄기'}
              >
                <Music size={15} />
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-800 shadow-md'} border text-xs font-bold transition-all`}
              title="테마 전환"
            >
              <span>{isDarkMode ? '🌙 다크 모드' : '☀️ 라이트 모드'}</span>
            </button>
            <div className="flex flex-col items-center gap-0.5 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-2xl backdrop-blur-md">
              <span className="text-[9px] text-slate-400">그래픽 품질: {graphicsQuality}%</span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={graphicsQuality}
                onChange={(e) => onGraphicsQualityChange(Number(e.target.value))}
                className="w-20 accent-cyan-500 cursor-pointer"
              />
            </div>
            <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-slate-900/95 border-slate-700/60' : 'bg-white border-slate-300 shadow-md'} border rounded-2xl px-4 py-2 backdrop-blur-md`}>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} font-semibold`}>닉네임:</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className={`${isDarkMode ? 'bg-slate-950 border-slate-700 text-cyan-300' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-lg px-2.5 py-1 text-xs font-bold outline-none w-28 text-center focus:border-cyan-400`}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full my-4 items-start">
          <div className={`lg:col-span-5 flex flex-col ${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'} rounded-3xl p-4 md:p-5 backdrop-blur-md`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                <Car size={16} /> 차량 커스텀 & 3D 쇼룸
              </h3>
              <span className="text-xs text-amber-300 font-semibold">{currentVehicleStats.category}</span>
            </div>
            <div className="flex-grow w-full mb-3 min-h-[150px] md:min-h-[200px]">
              <CarShowroom customization={customization} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <button onClick={() => handleModelChange('sport')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'sport' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md scale-[1.03]' : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'}`}>스포츠카</button>
              <button onClick={() => handleModelChange('suv')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'suv' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md scale-[1.03]' : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'}`}>SUV</button>
              <button onClick={() => handleModelChange('sedan')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'sedan' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md scale-[1.03]' : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'}`}>세단</button>
              <button onClick={() => handleModelChange('bike')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'bike' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md scale-[1.03]' : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'}`}>바이크</button>
            </div>
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 mb-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1"><Gauge size={12} className="text-cyan-400" /> 최고속도</span>
                <span className="font-mono text-cyan-300 font-bold">{currentVehicleStats.maxSpeed} km/h</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${(currentVehicleStats.maxSpeed / 220) * 100}%` }} />
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1">
                <span className="flex items-center gap-1"><Zap size={12} className="text-amber-400" /> 가속력</span>
                <span className="font-mono text-amber-300 font-bold">{currentVehicleStats.acceleration}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${(currentVehicleStats.acceleration / 120) * 100}%` }} />
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1">
                <span className="flex items-center gap-1"><Compass size={12} className="text-purple-400" /> 핸들링</span>
                <span className="font-mono text-purple-300 font-bold">{(currentVehicleStats.handling * 10).toFixed(1)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${(currentVehicleStats.handling / 1.0) * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Palette size={13} className="text-cyan-400" /> 차체 색상
              </span>
              <div className="flex gap-1.5">
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange('color', c)}
                    className={`w-5 h-5 rounded-full border ${
                      customization.color === c ? 'border-white scale-110 shadow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="bg-slate-900/80 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Sparkles size={16} /> 솔로 플레이 / AI 대전 시작
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">트랙 선택</label>
                  <select
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value as TrackId)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                  >
                    {(Object.keys(TRACK_METADATA) as TrackId[]).map((tId) => (
                      <option key={tId} value={tId}>
                        {TRACK_METADATA[tId].name} ({TRACK_METADATA[tId].difficulty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">AI 난이도</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                  >
                    <option value="easy">초급 (Easy)</option>
                    <option value="medium">중급 (Medium)</option>
                    <option value="hard">고급 (Hard - 도전적)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">AI봇 수 (0~4마리): {aiBotsCount}대</label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="1"
                      value={aiBotsCount}
                      onChange={(e) => setAiBotsCount(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                    />
                    <span className="text-xs font-black text-cyan-400 min-w-[36px] text-right">{aiBotsCount}대</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.init();
                  sound.resume();
                  sound.startMusic();
                  onQuickStart(selectedTrack, customization, nickname, aiBotsCount, aiDifficulty);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-400 hover:from-emerald-400 hover:to-sky-300 text-slate-950 font-black text-lg italic tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/30 transition-all hover:scale-[1.01]"
              >
                <Play size={20} fill="currentColor" /> 레이스 스타트 (솔로 / AI)
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Globe size={16} /> 멀티플레이어 멀티룸
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRefreshRoomList}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="새로고침"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md"
                  >
                    <PlusCircle size={14} /> 방 만들기
                  </button>
                </div>
              </div>
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {roomList.length === 0 ? (
                  <div className="py-10 text-center bg-slate-950/50 rounded-2xl border border-slate-800/80">
                    <p className="text-sm font-bold text-slate-400">생성된 멀티룸이 없습니다.</p>
                    <p className="text-xs text-slate-500 mt-1">새 방을 만들거나 솔로 플레이를 시작해보세요!</p>
                  </div>
                ) : (
                  roomList.map((room) => {
                    const trackMeta = TRACK_METADATA[room.trackId] || TRACK_METADATA['city-downtown'];
                    return (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{room.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 capitalize">
                              {room.gameMode === 'solo' ? '개인전' : room.gameMode === 'team2' ? '2v2 팀전' : '4v4 팀전'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>트랙: {trackMeta.name}</span>
                            <span>•</span>
                            <span>방장: {room.hostName}</span>
                            <span>•</span>
                            <span>인원: {room.playerCount}/{room.maxPlayers}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.init();
                            sound.resume();
                            sound.startMusic();
                            onJoinRoom(room.id, nickname, customization);
                          }}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105"
                        >
                          입장하기
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <PlusCircle className="text-cyan-400" /> 멀티플레이어 방 생성
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">방 이름</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={24}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 font-bold text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">게임 모드</label>
                    <select
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value as GameMode)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 font-bold text-white outline-none focus:border-cyan-400"
                    >
                      <option value="solo">개인전 (Solo)</option>
                      <option value="team2">2v2 팀전 (Team 2v2)</option>
                      <option value="team4">4v4 팀전 (Team 4v4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">트랙 선택</label>
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value as TrackId)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 font-bold text-white outline-none focus:border-cyan-400"
                    >
                      {(Object.keys(TRACK_METADATA) as TrackId[]).map((tId) => (
                        <option key={tId} value={tId}>
                          {TRACK_METADATA[tId].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">AI 난이도</label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 font-bold text-white outline-none focus:border-cyan-400"
                    >
                      <option value="easy">초급 (Easy)</option>
                      <option value="medium">중급 (Medium)</option>
                      <option value="hard">고급 (Hard - 도전적)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">AI 봇 수 (0~4): {aiBotsCount}대</label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={aiBotsCount}
                        onChange={(e) => setAiBotsCount(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-2.5 bg-slate-950 rounded-lg"
                      />
                      <span className="text-xs font-black text-cyan-400 min-w-[36px] text-right">{aiBotsCount}대</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.init();
                    sound.resume();
                    sound.startMusic();
                    setShowCreateModal(false);
                    onCreateRoom(newRoomName, selectedTrack, gameMode, aiDifficulty, aiBotsCount, nickname, customization);
                  }}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs"
                >
                  방 생성하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full flex flex-col justify-between p-3 md:p-6 select-none overflow-x-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto w-full pt-2">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <h1 className="text-2xl md:text-4xl font-black italic tracking-tight text-white">
            {roomState.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-200 text-xs font-bold shadow-lg transition-all"
          >
            <LogOut size={14} className="text-rose-400" />
            <span>나가기</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full my-4">
        <div className={`lg:col-span-5 flex flex-col ${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'} rounded-3xl p-4 md:p-5 backdrop-blur-md`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
              <Car size={16} /> 내 차량 ({nickname})
            </h3>
            <span className="text-xs text-amber-300 font-semibold">{currentVehicleStats.category}</span>
          </div>
          <div className="flex-grow w-full mb-3 min-h-[150px] md:min-h-[200px]">
            <CarShowroom customization={customization} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button onClick={() => handleModelChange('sport')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'sport' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md' : 'bg-slate-800/50 border-slate-700/60 text-slate-300'}`}>스포츠카</button>
            <button onClick={() => handleModelChange('suv')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'suv' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md' : 'bg-slate-800/50 border-slate-700/60 text-slate-300'}`}>SUV</button>
            <button onClick={() => handleModelChange('sedan')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'sedan' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md' : 'bg-slate-800/50 border-slate-700/60 text-slate-300'}`}>세단</button>
            <button onClick={() => handleModelChange('bike')} className={`p-2.5 rounded-xl border text-center transition-all ${customization.model === 'bike' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md' : 'bg-slate-800/50 border-slate-700/60 text-slate-300'}`}>바이크</button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400 font-semibold">차체 색상:</span>
            <div className="flex gap-1.5">
              {PRESET_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorChange('color', c)}
                  className={`w-5 h-5 rounded-full border ${
                    customization.color === c ? 'border-white scale-110 shadow-sm' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className={`${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'} rounded-3xl p-5 backdrop-blur-md`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                <Flag size={16} /> 트랙 및 규칙 설정 {isHost && <span className="text-xs text-slate-400 font-normal">(방장 설정 권한)</span>}
              </h3>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-bold uppercase">
                {roomState.gameMode === 'solo' ? '개인전' : roomState.gameMode === 'team2' ? '2v2 팀전' : '4v4 팀전'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              {(Object.keys(TRACK_METADATA) as TrackId[]).map((tId) => {
                const trk = TRACK_METADATA[tId];
                const isSelected = roomState.trackId === tId;
                return (
                  <button
                    key={tId}
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      onUpdateSettings(tId, roomState.laps, roomState.aiBotsCount, roomState.gameMode, roomState.aiDifficulty)
                    }
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-400 shadow-lg scale-[1.02]'
                        : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="text-xs font-bold text-white truncate">{trk.name}</div>
                    <div className="text-[10px] text-cyan-300 mt-0.5">{trk.difficulty}</div>
                  </button>
                );
              })}
            </div>
            {isHost && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">랩 수</label>
                  <select
                    value={roomState.laps}
                    onChange={(e) =>
                      onUpdateSettings(roomState.trackId, Number(e.target.value), roomState.aiBotsCount, roomState.gameMode, roomState.aiDifficulty)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-white"
                  >
                    {[1, 2, 3, 5].map((l) => (
                      <option key={l} value={l}>{l} 랩</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">AI 난이도</label>
                  <select
                    value={roomState.aiDifficulty}
                    onChange={(e) =>
                      onUpdateSettings(roomState.trackId, roomState.laps, roomState.aiBotsCount, roomState.gameMode, e.target.value as AIDifficulty)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-white"
                  >
                    <option value="easy">초급 (Easy)</option>
                    <option value="medium">중급 (Medium)</option>
                    <option value="hard">고급 (Hard)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">AI 봇 수</label>
                  <select
                    value={roomState.aiBotsCount}
                    onChange={(e) =>
                      onUpdateSettings(roomState.trackId, roomState.laps, Number(e.target.value), roomState.gameMode, roomState.aiDifficulty)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-white"
                  >
                    {[0, 2, 4, 6, 8, 10].map((b) => (
                      <option key={b} value={b}>{b === 0 ? '없음' : `AI ${b}대`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
            <h3 className="font-bold text-sm text-slate-300 flex items-center justify-between mb-3">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-cyan-400" /> 참여 중인 레이서 ({roomState.players.length}명)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">로비 대기중</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roomState.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    p.id === currentPlayer.id
                      ? 'bg-cyan-950/40 border-cyan-500/50'
                      : 'bg-slate-800/40 border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full border border-white/40"
                      style={{ backgroundColor: p.carColor }}
                    />
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isHost && <span className="text-[10px] text-amber-400 font-black">방장</span>}
                        {p.id === currentPlayer.id && (
                          <span className="text-[9px] px-1.5 rounded bg-cyan-500/20 text-cyan-300">YOU</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">{p.carModel}</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      p.isReady || p.isHost
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {p.isHost ? '방장' : p.isReady ? '준비 완료' : '대기중...'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
        <div className="text-xs text-slate-400">
          {isHost
            ? allPlayersReady
              ? '모든 플레이어가 준비되었습니다. 레이스를 시작하세요!'
              : '참가자들의 준비를 기다리는 중...'
            : currentPlayer.isReady
            ? '준비 완료! 방장의 시작을 기다리는 중...'
            : '준비 버튼을 눌러주세요.'}
        </div>
        <div className="flex items-center gap-3">
          {!isHost && (
            <button
              type="button"
              onClick={handleReadyToggle}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                currentPlayer.isReady
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-green-500 hover:bg-green-400 text-slate-950 font-black'
              }`}
            >
              {currentPlayer.isReady ? '준비 취소' : '준비하기 (READY)'}
            </button>
          )}
          {isHost ? (
            <button
              type="button"
              disabled={!allPlayersReady && roomState.players.length > 1}
              onClick={() => {
                sound.init();
                sound.resume();
                onStartRace();
              }}
              className={`px-8 py-4 rounded-xl font-black text-lg italic tracking-wider flex items-center gap-2 shadow-xl transition-all ${
                allPlayersReady || roomState.players.length <= 1
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-slate-950 scale-105 shadow-cyan-500/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Play size={20} fill="currentColor" /> 레이스 시작 (START RACE)
            </button>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>방장 대기중</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
