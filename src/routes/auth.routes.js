import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import { testSchema } from '../validations/auth.validation.js';

const router = Router();

//---- 회원가입 API
router.post('/sign-up', async (req, res, next) => {
  try {
    const { id, password, username } = req.body;
    const isExistUser = await prisma.user.findFirst({
      where: {
        id,
      },
    });
    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    testSchema.validate({ passowrd });
    const user = await prisma.user.create({
      data: {
        id,
        password: hashedPassword,
        username,
      },
    });
    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
});

//---- 로그인 API
router.post('/login', async (req, res, next) => {
  try {
    const { id, password } = req.body;
    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 아이디입니다.' });
    }
    // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // 로그인 성공 시 토큰 생성 및 응답
    const token = generateToken();
    res.header('authorization', `Bearer${token}`);
    return res.status(200).json({ message: '로그인 성공', token });
  } catch (error) {
    next(error);
  }
});

export default router;
