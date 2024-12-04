import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

router.post('/cards', async (req, res, next) => {
  try {
    let { name, tackle, physical, power, dribble, team_color, grade, type } =
      req.body;

    // 소문자 입력을 대문자로 변환
    type = type.toUpperCase();
    team_color = team_color.toUpperCase(); // team_color가 대문자로 오지 않으면 대문자로 변환
    grade = grade.toUpperCase(); // grade도 대문자로 변환

    // 유효한 타입인지 확인
    const validTypes = ['DEFENDER', 'ATTACKER'];
    const validTeamColors = [
      'KOREA',
      'US',
      'JAPAN',
      'CHINA',
      'UK',
      'SPAIN',
      'FRANCE',
      'ITALY',
      'ARGENTINA',
      'PORTUGAL',
    ];
    const validGrades = ['NORMAL', 'RARE', 'EPIC', 'LEGENDARY'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message:
          '유효하지 않은 포지션입니다. DEFENDER, ATTACKER 중 하나를 선택하세요.',
      });
    }
    if (!validTeamColors.includes(team_color)) {
      return res.status(400).json({
        message:
          '유효하지 않은 진영입니다. KOREA, US, JAPAN, CHINA, UK, SPAIN, FRANCE, ITALY, ARGENTINA, PORTUGAL 중 하나를 선택하세요.',
      });
    }
    if (!validGrades.includes(grade)) {
      return res.status(400).json({
        message:
          '유효하지 않은 등급입니다. NORMAL, RARE, EPIC, LEGENDARY 중 하나를 선택하세요.',
      });
    }

    // 같은 이름의 카드(선수)가 이미 등록되어 있으면, 중복 메시지 반환
    const isExistCardName = await prisma.card.findFirst({
      where: {
        name,
      },
    });

    if (isExistCardName) {
      return res.status(409).json({ message: '이미 존재하는 카드입니다.' });
    }

    const card = await prisma.card.create({
      data: {
        name,
        tackle,
        physical,
        power,
        dribble,
        team_color,
        grade,
        type,
      },
    });

    return res.status(201).json({ data: card });
  } catch (error) {
    //서버 오류 발생 시
    console.error(error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 서버에 존재하는 카드(선수) 리스트 조회
router.get('/cards', async (req, res, next) => {
  try {
    const cards = await prisma.card.findMany({
      select: {
        team_color: true,
        grade: true,
        type: true,
        name: true,
        tackle: true,
        physical: true,
        power: true,
        dribble: true,
      },
    });

    return res.status(200).json({ data: cards });
  } catch (error) {
    //서버 오류 발생 시
    console.error(error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
