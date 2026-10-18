/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT) || 3000;

type GameMode = 'solo' | 'team2' | 'team4';
type AIDifficulty = 'easy' | 'medium' | 'hard';
type TeamId = 'red' | 'blue' | 'green' | 'yellow' | 'none';

interface Player {
  id: string;
  name: string;
  carModel: string;
  carColor: string;
  accentColor: string;
  neonColor: string;
  team: TeamId;
  isHost: boolean;
  isReady: boolean;
  ws?: WebSocket;
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
  checkpoint: number;
  progress: number;
  finished: boolean;
  finishTime: number;
  place: number;
}

interface Room {
  id: string;
  name: string;
  hostId: string;
  trackId: string;
  laps: number;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  aiBotsCount: number;
  state: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownStartTime?: number;
  raceStartTime?: number;
  finishTimerStarted?: boolean;
  players: Map<string, Player>;
  itemsOnTrack: Array<{ id: string; type: string; x: number; y: number; z: number }>;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function broadcastToRoom(room: Room, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN && player.ws !== excludeWs) {
      player.ws.send(data);
    }
  }
}

function broadcastRoomList() {
  const list = getPublicRoomList();
  const msg = JSON.stringify({ type: 'room_list_update', rooms: list });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function getPublicRoomList() {
  const list: any[] = [];
  rooms.forEach((r) => {
    const hostPlayer = r.players.get(r.hostId);
    list.push({
      id: r.id,
      name: r.name || `Room ${r.id}`,
      hostName: hostPlayer?.name || 'Host',
      trackId: r.trackId,
      gameMode: r.gameMode,
      aiDifficulty: r.aiDifficulty,
      playerCount: r.players.size,
      maxPlayers: 8,
      state: r.state === 'racing' || r.state === 'countdown' ? 'racing' : 'lobby',
    });
  });
  return list;
}

function getSafePlayerList(room: Room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    carModel: p.carModel,
    carColor: p.carColor,
    accentColor: p.accentColor,
    neonColor: p.neonColor,
    team: p.team,
    isHost: p.isHost,
    isReady: p.isReady,
    lap: p.lap,
    checkpoint: p.checkpoint,
    progress: p.progress,
    finished: p.finished,
    finishTime: p.finishTime,
    place: p.place,
  }));
}

function assignTeam(room: Room): TeamId {
  if (room.gameMode === 'solo') return 'none';
  const redCount = Array.from(room.players.values()).filter(p => p.team === 'red').length;
  const blueCount = Array.from(room.players.values()).filter(p => p.team === 'blue').length;
  return redCount <= blueCount ? 'red' : 'blue';
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerId: string | null = null;

  ws.send(JSON.stringify({ type: 'room_list_update', rooms: getPublicRoomList() }));

  ws.on('message', (rawData: string) => {
    try {
      const msg = JSON.parse(rawData.toString());
      if (msg.type === 'get_room_list') {
        ws.send(JSON.stringify({ type: 'room_list_update', rooms: getPublicRoomList() }));
      } else if (msg.type === 'join_room' || msg.type === 'create_room') {
        let roomId = (msg.roomId || '').toUpperCase().trim();
        const isCreating = msg.type === 'create_room' || !roomId || !rooms.has(roomId);
        if (!roomId || (msg.type === 'create_room' && !rooms.has(roomId))) {
          roomId = generateRoomCode();
        }

        let room = rooms.get(roomId);
        if (!room) {
          room = {
            id: roomId,
            name: msg.roomName || `${(msg.name || 'Racer').trim()}'s Room`,
            hostId: '',
            trackId: msg.trackId || 'grand-prix-circuit',
            laps: msg.laps || 2,
            gameMode: msg.gameMode || 'solo',
            aiDifficulty: msg.aiDifficulty || 'medium',
            aiBotsCount: typeof msg.aiBotsCount === 'number' ? msg.aiBotsCount : 3,
            state: 'lobby',
            finishTimerStarted: false,
            players: new Map(),
            itemsOnTrack: [],
          };
          rooms.set(roomId, room);
        }

        const validPlayerId: string = msg.playerId || `p_${Math.random().toString(36).substring(2, 9)}`;
        playerId = validPlayerId;
        currentRoomId = roomId;

        const isHost = isCreating || room.players.size === 0 || room.hostId === validPlayerId;
        if (isHost) {
          room.hostId = validPlayerId;
        }

        const team = msg.team || assignTeam(room);
        const player: Player = {
          id: validPlayerId,
          name: (msg.name || 'Racer').trim().substring(0, 16) || 'Racer',
          carModel: msg.carModel || 'sport',
          carColor: msg.carColor || '#ef4444',
          accentColor: msg.accentColor || '#3b82f6',
          neonColor: msg.neonColor || '#06b6d4',
          team,
          isHost,
          isReady: isHost,
          ws,
          x: 0,
          y: 0,
          z: 0,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          speed: 0,
          steer: 0,
          drifting: false,
          boosting: false,
          lap: 1,
          checkpoint: 0,
          progress: 0,
          finished: false,
          finishTime: 0,
          place: 0,
        };

        room.players.set(validPlayerId, player);

        ws.send(JSON.stringify({
          type: 'room_joined',
          roomId,
          playerId: validPlayerId,
          isHost,
          room: {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            trackId: room.trackId,
            laps: room.laps,
            gameMode: room.gameMode,
            aiDifficulty: room.aiDifficulty,
            aiBotsCount: room.aiBotsCount,
            state: room.state,
            players: getSafePlayerList(room),
          },
        }));

        broadcastToRoom(room, {
          type: 'room_update',
          room: {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            trackId: room.trackId,
            laps: room.laps,
            gameMode: room.gameMode,
            aiDifficulty: room.aiDifficulty,
            aiBotsCount: room.aiBotsCount,
            state: room.state,
            players: getSafePlayerList(room),
          },
          event: `${player.name} joined the room`,
        }, ws);

        broadcastRoomList();
      } else if (msg.type === 'update_profile' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.players.has(playerId)) {
          const p = room.players.get(playerId)!;
          if (msg.name) p.name = msg.name.trim().substring(0, 16);
          if (msg.carModel) p.carModel = msg.carModel;
          if (msg.carColor) p.carColor = msg.carColor;
          if (msg.accentColor) p.accentColor = msg.accentColor;
          if (msg.neonColor) p.neonColor = msg.neonColor;
          if (msg.team) p.team = msg.team;
          if (typeof msg.isReady === 'boolean') p.isReady = msg.isReady;

          broadcastToRoom(room, {
            type: 'room_update',
            room: {
              id: room.id,
              name: room.name,
              hostId: room.hostId,
              trackId: room.trackId,
              laps: room.laps,
              gameMode: room.gameMode,
              aiDifficulty: room.aiDifficulty,
              aiBotsCount: room.aiBotsCount,
              state: room.state,
              players: getSafePlayerList(room),
            },
          });
        }
      } else if (msg.type === 'update_settings' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.hostId === playerId) {
          if (msg.trackId) room.trackId = msg.trackId;
          if (typeof msg.laps === 'number') room.laps = Math.max(1, Math.min(5, msg.laps));
          if (msg.gameMode) room.gameMode = msg.gameMode;
          if (msg.aiDifficulty) room.aiDifficulty = msg.aiDifficulty;
          if (typeof msg.aiBotsCount === 'number') room.aiBotsCount = Math.max(0, Math.min(10, msg.aiBotsCount));

          broadcastToRoom(room, {
            type: 'room_update',
            room: {
              id: room.id,
              name: room.name,
              hostId: room.hostId,
              trackId: room.trackId,
              laps: room.laps,
              gameMode: room.gameMode,
              aiDifficulty: room.aiDifficulty,
              aiBotsCount: room.aiBotsCount,
              state: room.state,
              players: getSafePlayerList(room),
            },
          });
          broadcastRoomList();
        }
      } else if (msg.type === 'start_race' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.hostId === playerId) {
          room.state = 'countdown';
          room.countdownStartTime = Date.now();
          room.finishTimerStarted = false;
          for (const p of room.players.values()) {
            p.lap = 1;
            p.checkpoint = 0;
            p.progress = 0;
            p.finished = false;
            p.finishTime = 0;
            p.place = 0;
            p.speed = 0;
          }
          broadcastToRoom(room, {
            type: 'race_countdown',
            startTime: room.countdownStartTime,
            trackId: room.trackId,
            laps: room.laps,
            aiBotsCount: room.aiBotsCount,
            aiDifficulty: room.aiDifficulty,
            gameMode: room.gameMode,
          });

          setTimeout(() => {
            if (room.state === 'countdown') {
              room.state = 'racing';
              room.raceStartTime = Date.now();
              broadcastToRoom(room, {
                type: 'race_started',
                startTime: room.raceStartTime,
              });
              broadcastRoomList();
            }
          }, 3500);
        }
      } else if (msg.type === 'car_update' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.players.has(playerId)) {
          const p = room.players.get(playerId)!;
          p.x = msg.x;
          p.y = msg.y;
          p.z = msg.z;
          p.rotX = msg.rotX;
          p.rotY = msg.rotY;
          p.rotZ = msg.rotZ;
          p.speed = msg.speed;
          p.steer = msg.steer;
          p.drifting = msg.drifting;
          p.boosting = msg.boosting;
          p.lap = msg.lap || p.lap;
          p.checkpoint = msg.checkpoint || p.checkpoint;
          p.progress = msg.progress || p.progress;

          broadcastToRoom(room, {
            type: 'peer_car_update',
            playerId,
            x: p.x,
            y: p.y,
            z: p.z,
            rotX: p.rotX,
            rotY: p.rotY,
            rotZ: p.rotZ,
            speed: p.speed,
            steer: p.steer,
            drifting: p.drifting,
            boosting: p.boosting,
            lap: p.lap,
            progress: p.progress,
          }, ws);
        }
      } else if (msg.type === 'use_item' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          broadcastToRoom(room, {
            type: 'item_used',
            userId: playerId,
            userName: room.players.get(playerId)?.name || 'Racer',
            itemType: msg.itemType,
            position: msg.position,
            targetId: msg.targetId,
          });
        }
      } else if (msg.type === 'player_finished' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.players.has(playerId)) {
          const p = room.players.get(playerId)!;
          if (!p.finished) {
            p.finished = true;
            p.finishTime = msg.finishTime || (Date.now() - (room.raceStartTime || Date.now()));
            const finishedCount = Array.from(room.players.values()).filter(x => x.finished).length;
            p.place = finishedCount;

            broadcastToRoom(room, {
              type: 'player_finished_broadcast',
              playerId,
              playerName: p.name,
              finishTime: p.finishTime,
              place: p.place,
            });

            if (finishedCount === 1 && !room.finishTimerStarted) {
              room.finishTimerStarted = true;
              broadcastToRoom(room, {
                type: 'finish_countdown_started',
                message: '결승선 통과! 10초 후 레이스가 종료됩니다.',
              });
              setTimeout(() => {
                if (room.state === 'racing') {
                  for (const rp of room.players.values()) {
                    if (!rp.finished) {
                      rp.finished = true;
                      rp.finishTime = Date.now() - (room.raceStartTime || Date.now());
                      const fc = Array.from(room.players.values()).filter(x => x.finished).length;
                      rp.place = fc;
                    }
                  }
                  room.state = 'finished';
                  broadcastToRoom(room, {
                    type: 'race_ended',
                    results: getSafePlayerList(room).sort((a, b) => a.place - b.place),
                  });
                  broadcastRoomList();
                }
              }, 10000);
            }

            const allFinished = Array.from(room.players.values()).every(x => x.finished);
            if (allFinished && room.state === 'racing') {
              room.state = 'finished';
              broadcastToRoom(room, {
                type: 'race_ended',
                results: getSafePlayerList(room).sort((a, b) => a.place - b.place),
              });
              broadcastRoomList();
            }
          }
        }
      } else if (msg.type === 'return_to_lobby' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room && room.hostId === playerId) {
          room.state = 'lobby';
          room.finishTimerStarted = false;
          for (const p of room.players.values()) {
            p.finished = false;
            p.isReady = p.isHost;
          }
          broadcastToRoom(room, {
            type: 'room_update',
            room: {
              id: room.id,
              name: room.name,
              hostId: room.hostId,
              trackId: room.trackId,
              laps: room.laps,
              gameMode: room.gameMode,
              aiDifficulty: room.aiDifficulty,
              aiBotsCount: room.aiBotsCount,
              state: room.state,
              players: getSafePlayerList(room),
            },
          });
          broadcastRoomList();
        }
      } else if (msg.type === 'leave_room' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.players.delete(playerId);
          if (room.players.size === 0) {
            rooms.delete(currentRoomId);
          } else {
            if (room.hostId === playerId) {
              const nextHost = room.players.values().next().value;
              if (nextHost) {
                room.hostId = nextHost.id;
                nextHost.isHost = true;
              }
            }
            broadcastToRoom(room, {
              type: 'room_update',
              room: {
                id: room.id,
                name: room.name,
                hostId: room.hostId,
                trackId: room.trackId,
                laps: room.laps,
                gameMode: room.gameMode,
                aiDifficulty: room.aiDifficulty,
                aiBotsCount: room.aiBotsCount,
                state: room.state,
                players: getSafePlayerList(room),
              },
            });
          }
          currentRoomId = null;
          broadcastRoomList();
        }
      } else if (msg.type === 'quick_chat' && currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          const p = room.players.get(playerId);
          broadcastToRoom(room, {
            type: 'quick_chat_message',
            senderName: p?.name || 'Racer',
            text: msg.text,
            emoji: msg.emoji,
          });
        }
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && playerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(playerId);
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          if (room.hostId === playerId) {
            const nextHost = room.players.values().next().value;
            if (nextHost) {
              room.hostId = nextHost.id;
              nextHost.isHost = true;
            }
          }
          broadcastToRoom(room, {
            type: 'room_update',
            room: {
              id: room.id,
              name: room.name,
              hostId: room.hostId,
              trackId: room.trackId,
              laps: room.laps,
              gameMode: room.gameMode,
              aiDifficulty: room.aiDifficulty,
              aiBotsCount: room.aiBotsCount,
              state: room.state,
              players: getSafePlayerList(room),
            },
          });
        }
        broadcastRoomList();
      }
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Turbo Drift 3D server running on port ${PORT}`);
  });
}

startServer();
