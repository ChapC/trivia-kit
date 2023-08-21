import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { EventMessageType, EventMessage, isCommandMessage, GameCommand, EffectMessage, } from 'triviakit-common';
import YAML from 'yaml';
import Game, { GameEvent, GameSettings, applyGameCommand, isGameSettings } from './Game';
import { existsSync, readFileSync } from 'fs';
import getIPs from './findIP';
import parseActivities from './ActivitiesParser';
import validateEffect from './EffectValidator';
import path from 'path';

dotenv.config();
let game = new Game();

const port = process.env.PORT || 80;
let ips = getIPs();
let useInterface = process.env.MEDIA_NET_INTERFACE;
let localIP = 'localhost';
if (useInterface) {
  if (ips[useInterface] && ips[useInterface].length > 0) {
    localIP = ips[useInterface][0];
  } else {
    console.warn(`Couldn't find network interface '${useInterface}' specified in .env`);
  }
} else {
  let ifaces = Object.keys(ips);
  if (ifaces[0] && ifaces[0][0]) {
    localIP = ips[ifaces[0]][0];
  }
}
const mediaBase = `http://${localIP}:${port}/media/`;

console.info(`Reading game-settings.yaml...`);
let settingsFile = readFileSync('./game-settings.yaml').toString();
let gameSettings: GameSettings;
try {
  let settingsObj = YAML.parse(settingsFile);
  if (isGameSettings(settingsObj)) {
    gameSettings = settingsObj;
  } else {
    console.error('game-settings.yaml is not a valid GameSettings object');
    process.exit(1);
  }
} catch (err) {
  console.error('YAML parse error for game-settings.yaml', err);
  process.exit(1);
}

gameSettings.game.players.map(p => game.addPlayer(p.name, mediaBase + p.img));

console.info(`Loading activities from ${gameSettings.game.activities}.yaml...`);
let activitiesFile = readFileSync(`${gameSettings.game.activities}.yaml`).toString();
try {
  game.activities = parseActivities(activitiesFile, mediaBase);
  console.info(`Loaded ${Object.keys(game.activities).length} activities`);
} catch (err) {
  console.error('Error while loading activities', err);
  process.exit(1);
}


const wss = new WebSocketServer({ noServer: true });
const app: Express = express();

app.use(cors());
app.use('/media', express.static('media'));
if (existsSync('web')) {
  function serveApp(webFolder: string, url?: string) {
    let hostAt = url || webFolder;
    let indexFile = path.join(process.cwd(), 'web', `${webFolder}/index.html`);
    let index = readFileSync(indexFile, { encoding: 'utf-8' });
    let indexWithBasePath = index.replace('main.js', `${hostAt}/main.js`);
    app.get(`/${hostAt}`, (req, res) => res.send(indexWithBasePath));
    app.use(`/${hostAt}`, express.static(`web/${webFolder}`));
  }

  serveApp('board', 'screen');
  serveApp('buzzer');
  serveApp('controller', 'host-controller');
}

const server = app.listen(port, () => {
  console.log(`⚡️ Server is online! I think I'm at http://${localIP}:${port}`);
});

const sockets: Map<number, WebSocket> = new Map();
let socketIdCounter = 0;
wss.on('connection', function connection(ws: WebSocket, request: IncomingMessage) {
  const socketId = socketIdCounter++;
  sockets.set(socketId, ws);

  function send(m: EventMessage, otherWs?: WebSocket) {
    (otherWs || ws).send(JSON.stringify(m));
  }

  let heartbeat = setInterval(() => {
    send({
      type: EventMessageType.Heartbeat,
      time: Date.now()
    });
  }, 1500);

  let gameListener = game.listen(GameEvent.StateChanged, state => send({
    type: EventMessageType.GameState,
    time: Date.now(),
    state
  }));

  ws.on('error', (ev) => {
    console.error('Websocket error', ev);
  });

  ws.on('close', function close(code, reason) {
    clearInterval(heartbeat);
    game.unlisten(gameListener);
    sockets.delete(socketId);
  });

  ws.on('message', function message(dataBuf) {
    try {
      let data = JSON.parse(dataBuf.toString());
      if (isCommandMessage(data)) {
        if (data.command === GameCommand.SendEffect) {
          if (typeof data.data.effect !== 'object') return;
          try {
            let effect: EffectMessage = {
              time: Date.now(), type: EventMessageType.Effect,
              effect: validateEffect(data.data.effect, game)
            }
            for (let otherSocket of sockets.values()) {
              send(effect, otherSocket);
            }
          } catch (err) {
            console.warn('Received invalid SendEffect command', err);
          }
        } else {
          applyGameCommand(game, data, true); // TODO check host password
        }
      }
    } catch { return; }
  });

  // Send initial state and activities
  send({
    type: EventMessageType.Activities, time: Date.now(),
    activities: game.activities
  });

  send({
    type: EventMessageType.GameState, time: Date.now(),
    state: game.getState()
  });

});

server.on('upgrade', function upgrade(request, socket, head) {
  const { pathname } = new URL(request.url!, `http://${request.headers.host}`);

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    })
  } else {
    socket.destroy();
  }
});