const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Отдаем статические файлы из корня проекта
app.use(express.static(__dirname));

// Отдаем HTML на корневой путь
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai-video-widget.html'));
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

