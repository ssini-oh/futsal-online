import express from 'express';
import { prisma } from '../utils/prisma/index.js'; // post 에서 만든거 사용함
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//---- 유저 목록 조회 API
router.get('/users', async (req, res, next) => {
  try {
    // 유저 목록 조회
    const allUsers = await prisma.user.findMany({
      select: {
        username: true,
        wins: true,
        losses: true,
      },
    });

    // 성공 응답 반환
    return res.status(200).json(allUsers);
  } catch (error) {
    console.error('아이탬 목록 조회 중 에러 발생: ', error);
    next(error);
  }
});

//---- 유저 카드 목록 조회 API
router.get('/users/cards', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // 카드 아이디 받아오기
    const cardIdxs = await prisma.userCard.findMany({
      where: {
        user_id: userId,
      },
      select: {
        card_idx: true,
      },
    });

    if (!cardIdxs)
      return res.status(200).json({ message: '보유 카드가 없습니다.' });

    // 객체 -> 배열
    const Idxs = cardIdxs.map((item) => item.card_idx);

    // 카드 정보 받아오기
    const userCards = await prisma.card.findMany({
      where: {
        idx: {
          in: Idxs,
        },
      },
      select: {
        name: true,
        physical: true,
        power: true,
        dribble: true,
        team_color: true,
        grade: true,
        type: true,
      },
    });

    // 성공 응답 반환
    return res.status(200).json(userCards);
  } catch (error) {
    console.error('보유 카드 검색 중 에러 발생: ', error);
    next(error);
  }
});

export default router;
