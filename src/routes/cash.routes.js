import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

//---- 캐시 충전 API (JWT 인증 미들웨어 추가 필요)
router.post('/cash', async (req, res, next) => {
  const { cash } = req.body;
  // const { userId } = req.user.id;
  const { userId } = req.body; // 테스트 진행용

  try {
    // 금액 유효성 체크
    if (!cash || typeof cash !== 'number' || cash <= 0) {
      return res
        .status(400)
        .json({ message: '유효하지 않은 충전 금액입니다.' });
    }

    // 데이터베이스 트랜잭션 실행 (일관성 및 무결성 보장을 위함)
    const [user, transaction] = await prisma.$transaction([
      // user 캐시 업데이트
      prisma.user.update({
        where: { id: userId },
        data: { cash: { increment: cash } },
      }),

      // 거래 내역 추가
      prisma.cashTransaction.create({
        data: { user_id: userId, amount: cash },
      }),
    ]);

    // 성공 응답 반환
    res.status(200).json({
      message: `${cash}골드 충전이 완료 되었습니다. 현재 골드 : ${user.cash}골드`,
      transaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
