import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateToken = (user) => {
  const token = jwt.sign(
    { userId: user.userId },
    process.env.JWT_SECRET, // env 파일에 JWT_SECRET를 설정이 필요합니다.
    { expiresIn: '1h' } // 유효기간 : 1시간
  );
  return token;
};
