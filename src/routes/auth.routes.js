import { Router } from 'express';
import bcrypt from 'bcrypt';

import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';

const router = Router();

//---- 회원가입 API

//---- 로그인 API

export default router;
