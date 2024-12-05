import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

router.get('/user/:user_Id', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        userId: +userId,
      },
    });

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

    return res.status(200).json({ data: userinfo });
  } catch (error) {
    next(error);
    //서버 오류 발생 시
  }
});
