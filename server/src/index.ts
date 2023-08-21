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

console.info('-- ❔ TriviaKit server 🧠 --');
const production = process.env.NODE_ENV === 'production';
let envPath = '';
if (existsSync(path.join(process.cwd(), '.env'))) {
  dotenv.config();
} else {
  envPath = '../';
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

if (process.env.MEDIA_HOME === undefined) {
  console.error('Missing MEDIA_HOME environment variable. Set this in an .env file in the root directory, pointing to the folder where the game media is located.');
  process.exit(1);
}
export const MEDIA_HOME = path.resolve(path.join(envPath, process.env.MEDIA_HOME));
console.info('Media root directory is at', MEDIA_HOME);

let game = new Game();

const port = process.env.PORT || (production ? 80 : 8334);
let ips = getIPs();
let useInterface = process.env.NET_INTERFACE;
let localIP = 'localhost';
if (useInterface) {
  if (ips[useInterface] && ips[useInterface].length > 0) {
    localIP = ips[useInterface][0];
  } else {
    console.warn(`Couldn't find network interface '${useInterface}' specified in NET_INTERFACE`);
  }
} else {
  if (ips['Ethernet'] && ips['Ethernet'][0]) {
    localIP = ips['Ethernet'][0];
  } else if (ips['Wi-Fi'] && ips['Wi-Fi'][0]) {
    localIP = ips['Wi-Fi'][0];
  } else {
    let ifaces = Object.keys(ips);
    if (ifaces[0] && ifaces[0][0]) {
      localIP = ips[ifaces[0]][0];
    }
  }
}
const mediaBaseUrl = `http://${localIP}:${port}/media/`;

console.info(`Reading game-settings.yaml...`);
let settingsFile = readFileSync(path.join(MEDIA_HOME, 'game-settings.yaml')).toString();
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

gameSettings.game.players.map(p => game.addPlayer(p.name, mediaBaseUrl + p.img));

console.info(`Loading activities from ${gameSettings.game.activities}.yaml...`);
let activitiesFile = readFileSync(path.join(MEDIA_HOME, `${gameSettings.game.activities}.yaml`)).toString();
try {
  game.activities = parseActivities(activitiesFile, mediaBaseUrl);
  console.info(`Loaded ${Object.keys(game.activities).length} activities`);
} catch (err) {
  console.error('Error while loading activities', err);
  process.exit(1);
}


const wss = new WebSocketServer({ noServer: true });
const app: Express = express();

app.use(cors());
app.use('/media', express.static(MEDIA_HOME));
const webPath = path.join(__dirname, 'web');
if (existsSync(webPath)) {
  function serveApp(webFolder: string, url?: string) {
    let hostAt = url || webFolder;
    let indexFile = path.join(webPath, `${webFolder}/index.html`);
    let index = readFileSync(indexFile, { encoding: 'utf-8' });
    let indexWithBasePath = index.replace('main.js', `${hostAt}/main.js`);
    app.get(`/${hostAt}`, (req, res) => res.send(indexWithBasePath));
    app.use(`/${hostAt}`, express.static(path.join(webPath, webFolder)));
  }

  serveApp('screen');
  serveApp('buzzer');
  serveApp('controller', 'host-controller');
}

const server = app.listen(port, () => {
  const serverUrl = `http://${localIP}:${port}`;
  console.log(`⚡️ Server is online! 
  📺 Screen at ${serverUrl}/screen
  🔴 Buzzers at ${serverUrl}/buzzer
  🎤 Host interface at ${serverUrl}/host-controller`);
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