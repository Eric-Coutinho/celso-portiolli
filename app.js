const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));
app.use(express.json());

const users = [
  { username: 'adm', password: '123' },
  { username: 'eric', password: '123' },
  { username: 'mateus', password: '123' },
];

const groups = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((user) => user.username === username && user.password === password);
  if (user) {
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Login failed' });
  }
});

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const userExists = users.some((user) => user.username === username);
  if (userExists) {
    res.status(409).json({ message: 'Username already exists' });
  } else {
    users.push({ username, password });
    res.status(201).json({ message: 'Signup successful' });
  }
});

app.get('/groups', (req, res) => {
  res.json(groups);
});

io.on('connection', (socket) => {
  console.log('Usuário conectado');

  socket.on('login', ({ username }) => {
    console.log(`Usuário ${socket.id} (${username}) fez login`);
  });

  socket.on('join group', ({ groupName, username }) => {
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push({ id: socket.id, username });
    socket.join(groupName);
    console.log(`Usuário ${socket.id} (${username}) entrou no grupo ${groupName}`);
  });

  socket.on('chat message', ({ groupName, message, username }) => {
    if (groups[groupName]) {
      io.to(groupName).emit('chat message', { sender: username, message });
      console.log(`Mensagem enviada por ${socket.id} (${username}) no grupo ${groupName}: ${message}`);
    }
  });

  socket.on('leave group', (groupName) => {
    if (groups[groupName]) {
      const index = groups[groupName].findIndex((member) => member.id === socket.id);
      if (index !== -1) {
        const { username } = groups[groupName][index];
        groups[groupName].splice(index, 1);
        if (groups[groupName].length === 0) {
          delete groups[groupName];
        }
        socket.leave(groupName);
        console.log(`Usuário ${socket.id} (${username}) saiu do grupo ${groupName}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
    for (const groupName in groups) {
      const index = groups[groupName].findIndex((member) => member.id === socket.id);
      if (index !== -1) {
        const { username } = groups[groupName][index];
        groups[groupName].splice(index, 1);
        if (groups[groupName].length === 0) {
          delete groups[groupName];
        }
        socket.leave(groupName);
        console.log(`Usuário ${socket.id} (${username}) saiu do grupo ${groupName} devido à desconexão`);
      }
    }
  });
});

const port = 3000;
http.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
