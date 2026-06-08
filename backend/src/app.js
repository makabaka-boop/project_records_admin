const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
require('./models/database');

const app = express();
const PORT = 8022;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: '项目资料管理系统 API 服务', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
