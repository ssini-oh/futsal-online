// routes/deck.routes.js

import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

//------ 덱 생성 API (JWT 인증 미들웨어 추가 필요)
router.post('/users/decks', async (req, res, next) => {
  const { cardIds } = req.body;
  // const { userId } = req.user.id;
  const { userId } = req.body; // 테스트 진행용

  try {
    // 유
  } catch (error) {
    next(error);
  }
});
