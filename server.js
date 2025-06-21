const express = require('express');
const fs = require('fs');
const fse = require('fs-extra');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const ROOT_DIR = __dirname;
const SERVER_DIR = __dirname;
const JAR_NAME = 'server.jar';

app.use(express.static('public'));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

app.get('/api/files', (req, res) => {
  const targetDir = req.query.dir || ROOT_DIR;
  fs.readdir(targetDir, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ files });
  });
});

app.get('/api/file', (req, res) => {
  const file = path.join(ROOT_DIR, req.query.path || '');
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.send(data);
  });
});

app.post('/api/save', (req, res) => {
  const file = path.join(ROOT_DIR, req.body.path || '');
  fs.writeFile(file, req.body.content, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  const destPath = path.join(ROOT_DIR, req.body.dest || '', req.file.originalname);
  fse.move(req.file.path, destPath, { overwrite: true }, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
});

app.post('/api/delete', (req, res) => {
  const target = path.join(ROOT_DIR, req.body.path || '');
  fse.remove(target, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
});

let serverProcess = null;
io.on('connection', (socket) => {
  socket.on('start', () => {
    if (serverProcess) return;

    serverProcess = spawn('java', ['-Xms7168M', '-Xmx7168M', '-jar', JAR_NAME, 'nogui'], {
      cwd: SERVER_DIR
    });

    const logStream = fs.createWriteStream(path.join(SERVER_DIR, 'log.txt'), { flags: 'a' });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      socket.emit('console', msg);
      logStream.write(msg);
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = `[ERR] ${data.toString()}`;
      socket.emit('console', msg);
      logStream.write(msg);
    });

    serverProcess.on('close', (code) => {
      socket.emit('console', `server closed with code  ${code}`);
      serverProcess = null;
      logStream.end(`server closed with code ${code}\n`);
    });
  });

  socket.on('command', (cmd) => {
    if (serverProcess) {
      serverProcess.stdin.write(cmd + '\n');
    }
  });
});

http.listen(7282, () => {
  console.log('web on : http://localhost:7282');
});

