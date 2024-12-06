import express from 'express';

import errorHandlerMiddleware from './middlewares/error-handler.middleware.js';
import Joi from 'joi';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import cashRoutes from './routes/cash.routes.js';
import cardRoutes from './routes/cards.routes.js';
import gameRoutes from './routes/game.routes.js';
import deckRoutes from './routes/deck.routes.js';
import userinfoRoutes from './routes/userinfo.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 라우트
app.use('/api', [
  authRoutes,
  cardRoutes,
  cashRoutes,
  gameRoutes,
  userRoutes,
  userinfoRoutes,
  deckRoutes
]);

// 에러 처리 미들웨어
app.use(errorHandlerMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
