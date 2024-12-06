import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import { testSchema } from '../validations/auth.validation.js';

const router = Router();

//---- 회원가입 API
router.post('/sign-up', async (req, res, next) => {
  try {
    const { id, password, confirmPassword, username } = req.body;

    // Joi 유효성 검사
    await testSchema.validateAsync({ id, password, confirmPassword });

    const isExistUser = await prisma.user.findFirst({
      where: {
        id,
      },
    });

    // 이미 존재하는 아이디인지 확인
    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 계정 생성
    const user = await prisma.user.create({
      data: {
        id,
        password: hashedPassword,
        username,
      },
    });

    // 성공 응답 반환
    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
});

//---- 로그인 API
router.post('/login', async (req, res, next) => {
  try {
    const { id, password } = req.body;

    // 존재하는 사용자인지 확인
    const user = await prisma.user.findFirst({ where: { id } });

    if (!user) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    // 비밀번호 일치 여부 확인
    if (!(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    // 로그인 성공 시 토큰 생성 및 응답
    const token = generateToken(id);
    res.header('authorization', `Bearer ${token}`);

    // 성공 응답 반환
    return res.status(200).json({ message: '로그인에 성공하셨습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
