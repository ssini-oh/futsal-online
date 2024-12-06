import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

//---- 유저 정보 상세 조회 API
router.get('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 유저 아이디 조회
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res
        .status(404)
        .json({ message: '해당 유저가 존재하지 않습니다.' });
    }

    const userinfo = {
      username: user.username,
      cash: user.cash,
      wins: user.wins,
      losses: user.losses,
      created_at: user.created_at,
    };

    // 성공 응답 반환
    return res.status(200).json({ data: userinfo });
  } catch (error) {
    next(error);
  }
});

export default router;
