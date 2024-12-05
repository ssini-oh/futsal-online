// routes/deck.routes.js

import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//------ 덱 생성 API (JWT 인증 미들웨어 추가 필요)
router.post('/users/decks', authMiddleware, async (req, res, next) => {
  const { cardId } = req.body;
  const userId = req.user.id;

  try {
    // 유저가 소요한 카드인지 확인
    const userCard = await prisma.userCard.findFirst({
      where: {
        user_id: userId,
        card_idx: cardId,
      },
    });

    if (!userCard) {
      return res.status(400).json({ message: '소유하지 않은 카드입니다.' });
    }

    // 현재 덱 상태 확인
    let userDeck = await prisma.deck.findFirst({
      where: { user_id: userId },
    });

    if (!userDeck) {
      // 덱이 없을 경우 덱 생성
      userDeck = await prisma.deck.create({
        data: {
          user_id: userId,
          card_1_idx: null,
          card_2_idx: null,
          card_3_idx: null,
          // user: { connect: { id: userId } },
          // card1: { connect: { id: userCard.card_idx } },
          // card2: { connect: { id: userCard.card_idx } },
          // card3: { connect: { id: userCard.card_idx } },
        },
      });
    }

    // 덱에 중복된 카드가 있는지 확인
    const existingCards = [
      userDeck.card_1_idx,
      userDeck.card_2_idx,
      userDeck.card_3_idx,
    ];

    if (existingCards.includes(cardId)) {
      return res.status(400).json({ message: '이미 덱에 포함된 카드입니다.' });
    }

    // 덱에 빈 슬롯 확인 및 카드 추가
    let updatedDeck;

    switch (true) {
      case !userDeck.card_1_idx:
        updatedDeck = await prisma.deck.update({
          // where: { user_id: userId },
          where: { idx: userDeck.idx }, // Deck 테이블의 고유 필드
          data: { card_1_idx: cardId },
        });
        break;

      case !userDeck.card_2_idx:
        updatedDeck = await prisma.deck.update({
          // where: { user_id: userId },
          where: { idx: userDeck.idx }, // Deck 테이블의 고유 필드
          data: { card_2_idx: cardId },
        });
        break;

      case !userDeck.card_3_idx:
        updatedDeck = await prisma.deck.update({
          // where: { user_id: userId },
          where: { idx: userDeck.idx }, // Deck 테이블의 고유 필드
          data: { card_3_idx: cardId },
        });
        break;

      default:
        return res.status(400).json({ message: '덱이 가득 찼습니다.' });
    }

    // 성공 응답 반환
    res.status(200).json({
      message: '카드가 덱에 추가되었습니다.',
      deck: updatedDeck,
    });
  } catch (error) {
    console.log('111111');
    console.error(error);
    next(error);
  }
});

export default router;
