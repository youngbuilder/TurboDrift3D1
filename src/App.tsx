/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { sound } from './game/audio';
import { GameCanvas } from './game/GameCanvas';
import { BotRacer, VehicleState } from './game/physics';
import { HUD } from './components/HUD';
import { Lobby } from './components/Lobby';
import { Podium } from './components/Podium';
import {
  AIDifficulty,
  CarCustomization,
  ChatMessage,
  GameMode,
  PeerCarState,
  PlayerInfo,
  RoomState,
  RoomSummary,
  TrackId,
} from './types/game';

export default function App() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerInfo | null>(null);
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [vehicleState, setVehicleState] = useState<VehicleState | null>(null);
  const [bots, setBots] = useState<BotRacer[]>([]);
  const [raceResults, setRaceResults] = useState<PlayerInfo[]>([]);
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [cameraMode, setCameraMode] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [finishCountdownNotice, setFinishCountdownNotice] = useState<string | null>(null);
  const [graphicsQuality, setGraphicsQuality] = useState<number>(100);

  const socketRef = useRef<WebSocket | null>(null);
  const peerStatesRef = useRef<Map<string, PeerCarState>>(new Map());
  const resetCarRef = useRef<(() => void) | null>(null);

  const [touchInputs, setTouchInputs] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    item: false,
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const startCountdownSequence = (onComplete: () => void) => {
    let count = 3;
    setCountdownText(count.toString());
    sound.playCountdown(false);
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownText(count.toString());
        sound.playCountdown(false);
      } else {
        clearInterval(interval);
        setCountdownText('GO!');
        sound.playCountdown(true);
        sound.startMusic();
        setTimeout(() => {
          setCountdownText(null);
          onComplete();
        }, 800);
      }
    }, 1000);
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let ws: WebSocket;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to Turbo Drift 3D server');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'room_list_update') {
              setRoomList(data.rooms || []);
            } else if (data.type === 'room_joined') {
              setRoomState(data.room);
              const myPlayer = data.room.players.find((p: PlayerInfo) => p.id === data.playerId);
              if (myPlayer) {
                setCurrentPlayer(myPlayer);
              }
            } else if (data.type === 'room_update') {
              setRoomState(data.room);
              if (currentPlayer) {
                const myPlayer = data.room.players.find((p: PlayerInfo) => p.id === currentPlayer.id);
                if (myPlayer) setCurrentPlayer(myPlayer);
              }
            } else if (data.type === 'race_countdown') {
              setFinishCountdownNotice(null);
              setRoomState((prev) => (prev ? { ...prev, state: 'countdown' } : null));
              startCountdownSequence(() => {
                setRoomState((prev) => (prev ? { ...prev, state: 'racing' } : null));
              });
            } else if (data.type === 'race_started') {
              setRoomState((prev) => (prev ? { ...prev, state: 'racing' } : null));
            } else if (data.type === 'finish_countdown_started') {
              setFinishCountdownNotice(data.message || '결승선 통과! 10초 후 종료.');
              setTimeout(() => setFinishCountdownNotice(null), 6000);
            } else if (data.type === 'peer_car_update') {
              peerStatesRef.current.set(data.playerId, {
                playerId: data.playerId,
                x: data.x,
                y: data.y,
                z: data.z,
                rotX: data.rotX,
                rotY: data.rotY,
                rotZ: data.rotZ,
                speed: data.speed,
                steer: data.steer,
                drifting: data.drifting,
                boosting: data.boosting,
                lap: data.lap,
                progress: data.progress,
              });
            } else if (data.type === 'quick_chat_message') {
              const newMsg: ChatMessage = {
                id: Math.random().toString(),
                senderName: data.senderName,
                text: data.text,
                emoji: data.emoji,
                timestamp: Date.now(),
              };
              setChatMessages((prev) => [...prev.slice(-4), newMsg]);
              setTimeout(() => {
                setChatMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
              }, 4000);
            } else if (data.type === 'race_ended') {
              setFinishCountdownNotice(null);
              setRaceResults(data.results);
              setRoomState((prev) => (prev ? { ...prev, state: 'finished' } : null));
            }
          } catch (e) {
            console.error('WebSocket receive error:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(() => {
            if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
              connect();
            }
          }, 2500);
        };
      } catch (e) {
        console.warn('WebSocket fallback active');
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleQuickStart = (trackId: TrackId, customization: CarCustomization, riderName: string) => {
    finishCountdownStartedRef.current = false;
    setFinishCountdownNotice(null);
    const myId = `player_${Math.random().toString(36).substring(2, 7)}`;
    const player: PlayerInfo = {
      id: myId,
      name: riderName || '스피드레이서',
      carModel: customization.model,
      carColor: customization.color,
      accentColor: customization.accentColor,
      neonColor: customization.neonColor,
      isHost: true,
      isReady: true,
      team: 'none',
      lap: 1,
      checkpoint: 0,
      progress: 0,
      finished: false,
      finishTime: 0,
      place: 1,
    };
    const quickRoom: RoomState = {
      id: Math.random().toString(36).substring(2, 7).toUpperCase(),
      name: '솔로 / AI 대전',
      hostId: myId,
      trackId,
      laps: 2,
      gameMode: 'solo',
      aiDifficulty: 'medium',
      aiBotsCount: 4,
      state: 'countdown',
      players: [player],
    };
    setCurrentPlayer(player);
    setRoomState(quickRoom);
    startCountdownSequence(() => {
      setRoomState((prev) => (prev ? { ...prev, state: 'racing' } : null));
    });
  };

  const handleCreateRoom = (
    roomName: string,
    trackId: TrackId,
    gameMode: GameMode,
    aiDifficulty: AIDifficulty,
    botsCount: number,
    name: string,
    customization: CarCustomization
  ) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'create_room',
          roomName,
          trackId,
          gameMode,
          aiDifficulty,
          aiBotsCount: botsCount,
          name,
          carModel: customization.model,
          carColor: customization.color,
          accentColor: customization.accentColor,
          neonColor: customization.neonColor,
        })
      );
    } else {
      handleQuickStart(trackId, customization, name);
    }
  };

  const handleJoinRoom = (roomId: string, name: string, customization: CarCustomization) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'join_room',
          roomId,
          name,
          carModel: customization.model,
          carColor: customization.color,
          accentColor: customization.accentColor,
          neonColor: customization.neonColor,
        })
      );
    } else {
      handleQuickStart('grand-prix-circuit', customization, name);
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'leave_room' }));
    }
    setRoomState(null);
    setCurrentPlayer(null);
  };

  const handleUpdateProfile = (name: string, customization: CarCustomization, isReady: boolean, team: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'update_profile',
          name,
          carModel: customization.model,
          carColor: customization.color,
          accentColor: customization.accentColor,
          neonColor: customization.neonColor,
          team,
          isReady,
        })
      );
    }
    if (currentPlayer) {
      setCurrentPlayer({
        ...currentPlayer,
        name,
        carModel: customization.model,
        carColor: customization.color,
        accentColor: customization.accentColor,
        neonColor: customization.neonColor,
        team,
        isReady,
      });
    }
  };

  const handleUpdateSettings = (
    trackId: TrackId,
    laps: number,
    bots: number,
    gameMode: GameMode,
    aiDifficulty: AIDifficulty
  ) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'update_settings',
          trackId,
          laps,
          aiBotsCount: bots,
          gameMode,
          aiDifficulty,
        })
      );
    }
    if (roomState) {
      setRoomState({
        ...roomState,
        trackId,
        laps,
        aiBotsCount: bots,
        gameMode,
        aiDifficulty,
      });
    }
  };

  const finishCountdownStartedRef = useRef(false);

  const handleStartRace = () => {
    sound.init();
    sound.resume();
    finishCountdownStartedRef.current = false;
    setFinishCountdownNotice(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'start_race' }));
    } else {
      setRoomState((prev) => (prev ? { ...prev, state: 'countdown' } : null));
      startCountdownSequence(() => {
        setRoomState((prev) => (prev ? { ...prev, state: 'racing' } : null));
      });
    }
  };

  const handleSendCarUpdate = (update: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'car_update',
          ...update,
        })
      );
    }
  };

  const handleFinishRace = (finishTime: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'player_finished',
          finishTime,
        })
      );
    }

    if (currentPlayer && !finishCountdownStartedRef.current) {
      finishCountdownStartedRef.current = true;
      let leftSec = 10;
      setFinishCountdownNotice(`🏆 선두 결승선 통과! 10초 후 경기 종료 및 순위 산출 (${leftSec}초)`);
      sound.playVictoryFanfare();

        const timer = setInterval(() => {
          leftSec--;
          if (leftSec <= 0) {
            clearInterval(timer);
            setFinishCountdownNotice(null);

            const allRacers = [
              {
                id: currentPlayer.id,
                name: currentPlayer.name,
                carModel: currentPlayer.carModel,
                carColor: currentPlayer.carColor,
                accentColor: currentPlayer.accentColor,
                neonColor: currentPlayer.neonColor,
                lap: vehicleState?.currentLap || 1,
                progress: vehicleState?.totalProgress || 0,
                finished: vehicleState?.isFinished || false,
                time: vehicleState?.finishTime || Date.now(),
              },
              ...bots.map((b) => ({
                id: b.id,
                name: b.name,
                carModel: b.carModel,
                carColor: b.carColor,
                accentColor: b.accentColor,
                neonColor: b.neonColor,
                lap: b.lap,
                progress: b.totalProgress,
                finished: b.isFinished,
                time: b.finishTime || Date.now(),
              })),
              ...Array.from(peerPlayersMap.values()).map((p) => ({
                id: p.id,
                name: p.name,
                carModel: p.carModel,
                carColor: p.carColor,
                accentColor: p.accentColor,
                neonColor: p.neonColor,
                lap: p.lap,
                progress: p.progress,
                finished: p.finished,
                time: p.finishTime || Date.now(),
              })),
            ];

            allRacers.sort((a, b) => {
              if (a.finished && b.finished) return a.time - b.time;
              if (a.finished) return -1;
              if (b.finished) return 1;
              if (a.lap !== b.lap) return b.lap - a.lap;
              return b.progress - a.progress;
            });

            const finalResults: PlayerInfo[] = allRacers.map((r, idx) => ({
              id: r.id,
              name: r.name,
              carModel: r.carModel,
              carColor: r.carColor,
              accentColor: r.accentColor,
              neonColor: r.neonColor,
              isHost: r.id === currentPlayer.id,
              isReady: true,
              team: 'none',
              lap: r.lap,
              checkpoint: 0,
              progress: r.progress,
              finished: r.finished,
              finishTime: r.time,
              place: idx + 1,
            }));

            setRaceResults(finalResults);
            setRoomState((prev) => (prev ? { ...prev, state: 'finished' } : null));
          } else {
            setFinishCountdownNotice(`🏆 선두 결승선 통과! 10초 후 경기 종료 및 순위 산출 (${leftSec}초)`);
          }
        }, 1000);
      }
  };

  const handleItemUsed = (type: string, position: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'use_item',
          itemType: type,
          position: { x: position.x, y: position.y, z: position.z },
        })
      );
    }
  };

  const handleSendQuickChat = (emoji: string, text: string) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderName: currentPlayer?.name || '레이서',
      text,
      emoji,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-4), newMsg]);
    setTimeout(() => {
      setChatMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
    }, 4000);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'quick_chat',
          emoji,
          text,
        })
      );
    }
  };

  const handleReturnToLobby = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'return_to_lobby' }));
    }
    setRaceResults([]);
    setRoomState((prev) => (prev ? { ...prev, state: 'lobby' } : null));
  };

  useEffect(() => {
    if (roomState?.state === 'finished') {
      const timer = setTimeout(() => {
        handleReturnToLobby();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [roomState?.state]);

  const handleResetCar = () => {
    if (resetCarRef.current) {
      resetCarRef.current();
    } else if (vehicleState) {
      vehicleState.speedKmh = 0;
      vehicleState.isSpinning = false;
    }
  };

  const handleCycleCamera = () => {
    setCameraMode((prev) => (prev + 1) % 2);
  };

  const handleRefreshRoomList = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'get_room_list' }));
    }
  };

  const peerPlayersMap = new Map<string, PlayerInfo>();
  if (roomState && currentPlayer) {
    roomState.players.forEach((p) => {
      if (p.id !== currentPlayer.id) {
        peerPlayersMap.set(p.id, p);
      }
    });
  }

  const isRacingOrFinished =
    roomState?.state === 'racing' || roomState?.state === 'finished' || roomState?.state === 'countdown';

  return (
    <div className={`relative w-full min-h-screen overflow-y-auto overflow-x-hidden font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      {(!roomState || roomState.state === 'lobby') && (
        <Lobby
          roomState={roomState}
          currentPlayer={currentPlayer}
          roomList={roomList}
          onUpdateProfile={handleUpdateProfile}
          onUpdateSettings={handleUpdateSettings}
          onStartRace={handleStartRace}
          onQuickStart={handleQuickStart}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onRefreshRoomList={handleRefreshRoomList}
          onSendChat={handleSendQuickChat}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          graphicsQuality={graphicsQuality}
          onGraphicsQualityChange={setGraphicsQuality}
        />
      )}

      {isRacingOrFinished && currentPlayer && roomState && (
        <>
          <GameCanvas
            trackId={roomState.trackId}
            totalLaps={roomState.laps}
            aiBotsCount={roomState.aiBotsCount}
            aiDifficulty={roomState.aiDifficulty}
            gameMode={roomState.gameMode}
            playerInfo={currentPlayer}
            peerPlayers={peerPlayersMap}
            peerStatesRef={peerStatesRef}
            onStateUpdate={setVehicleState}
            onSendCarUpdate={handleSendCarUpdate}
            onFinishRace={handleFinishRace}
            onItemUsed={handleItemUsed}
            cameraMode={cameraMode}
            onCycleCamera={handleCycleCamera}
            touchControls={touchInputs}
            isRacing={roomState.state === 'racing'}
            graphicsQuality={graphicsQuality}
            resetCarRef={resetCarRef}
            onBotsUpdate={setBots}
          />
          <HUD
            vehicleState={vehicleState}
            totalLaps={roomState.laps}
            totalRacers={roomState.players.length + roomState.aiBotsCount}
            roomId={roomState.id}
            cameraMode={cameraMode}
            playerTeam={currentPlayer.team}
            onCycleCamera={handleCycleCamera}
            onResetCar={handleResetCar}
            onUseItem={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
            }}
            onForfeit={handleLeaveRoom}
            onSendQuickChat={handleSendQuickChat}
            onTouchInput={setTouchInputs}
            isDarkMode={isDarkMode}
            graphicsQuality={graphicsQuality}
            onGraphicsQualityChange={setGraphicsQuality}
            aiBotsCount={roomState.aiBotsCount}
            playerInfo={currentPlayer}
            peerPlayers={peerPlayersMap}
            bots={bots}
          />
        </>
      )}

      {finishCountdownNotice && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500/90 text-slate-950 font-black px-6 py-2.5 rounded-2xl shadow-2xl animate-bounce text-sm md:text-base border border-amber-300">
          {finishCountdownNotice}
        </div>
      )}

      {countdownText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none select-none bg-transparent">
          <div className="text-center animate-ping">
            <span
              className={`font-black italic tracking-tighter text-8xl md:text-9xl drop-shadow-[0_0_40px_rgba(6,182,212,0.9)] ${
                countdownText === 'GO!' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {countdownText}
            </span>
          </div>
        </div>
      )}

      {roomState?.state === 'finished' && currentPlayer && (
        <Podium
          results={raceResults.length > 0 ? raceResults : roomState.players}
          currentPlayerId={currentPlayer.id}
          isHost={currentPlayer.isHost}
          onReturnToLobby={handleReturnToLobby}
          onRematch={handleStartRace}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="fixed top-20 left-4 z-40 pointer-events-none flex flex-col gap-2 max-w-xs">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white text-xs shadow-xl backdrop-blur-md animate-fade-in"
          >
            <span className="text-base">{msg.emoji}</span>
            <span className="font-bold text-cyan-300">{msg.senderName}:</span>
            <span className="text-slate-200">{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
