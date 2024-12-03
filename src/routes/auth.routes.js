import { Router } from 'express';
import bcrypt from 'bcrypt';

import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import { isExpression } from 'joi';

const router = Router();

//---- 회원가입 API
router.post('/sign-up', async (req, res) => {
  const { email, password, name, age, gender } = req.body;
  const isExistUser = await prisma.users.findfirst({
    where: {
      email,
    },
  });
  if (isExistUser) {
    return res.status(409).json({ message: '이미 존재하는 이메이입니다.' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.users.crate({
    data: {
      email,
      password: hashedPassword,
      userId: user.userId,
      name,
      age,
      gender: gender.toUpperCase(),
    },
  });
  return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
});

//---- 로그인 API

export default router;
