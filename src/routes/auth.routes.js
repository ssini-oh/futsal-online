import { Router } from 'express';
import bcrypt from 'bcrypt';

import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';

const router = Router();

//---- 회원가입 API
router.post('/sign-up', async (req, res) => {
  try {
    const { id, password, username, confirmPassword } = req.body;
    const isExistUser = await prisma.user.findFirst({
      where: {
        id,
      },
    });
    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const accountRegex = /^[a-z]+[a-z0-9]{5,19}$/g;
    if (password.length < 6) {
      return resizeBy
        .status(400)
        .json({ message: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: '비밀번호와 비밀번호 확인이 일치하지않습니다' });
    }
    if (!accountRegex.test(id)) {
      return res.status(400).json({
        message:
          '아이디는 영문자로 시작하는 6~20자 영문자 또는 숫자이어야 합니다',
      });
    }

    const user = await prisma.user.create({
      data: {
        id: user.id,
        password: hashedPassword,
        username,
      },
    });
    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

//---- 로그인 API
router.post('/sign-in', async (req, res) => {
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
    const token = generateToken(user.id);
    return res.status(200).json({ message: '로그인 성공', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
