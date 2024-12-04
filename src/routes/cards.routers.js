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

// 가챠 API: /users/:user_id/cards
router.post('/users/:user_id/cards', async (req, res, next) => {
  try {
    const { user_id } = req.params; // URL 파라미터에서 user_id를 가져옴
    const gachaCost = 500; // 가챠 비용 설정

    // 유저 확인
    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 유저입니다.' });
    }

    // 유저 자금 확인
    if (user.cash < gachaCost) {
      return res.status(400).json({
        message: '가챠를 하기 위한 골드가 부족합니다.',
      });
    }

    // 각 grade별 카드의 확률을 설정
    const cardProbabilities = {
      NORMAL: 0.7, // 70% 확률
      RARE: 0.25, // 25% 확률
      EPIC: 0.04, // 4% 확률
      LEGENDARY: 0.01, // 1% 확률
    };

    // 각 grade별 카드 목록 조회
    const normalCards = await prisma.card.findMany({
      where: { grade: 'NORMAL' },
    });
    const rareCards = await prisma.card.findMany({ where: { grade: 'RARE' } });
    const epicCards = await prisma.card.findMany({ where: { grade: 'EPIC' } });
    const legendaryCards = await prisma.card.findMany({
      where: { grade: 'LEGENDARY' },
    });

    // 확률에 맞게 카드 선택
    const rand = Math.random();

    let selectedCard;

    if (rand < cardProbabilities.NORMAL) {
      selectedCard =
        normalCards[Math.floor(Math.random() * normalCards.length)];
    } else if (rand < cardProbabilities.NORMAL + cardProbabilities.RARE) {
      selectedCard = rareCards[Math.floor(Math.random() * rareCards.length)];
    } else if (
      rand <
      cardProbabilities.NORMAL + cardProbabilities.RARE + cardProbabilities.EPIC
    ) {
      selectedCard = epicCards[Math.floor(Math.random() * epicCards.length)];
    } else {
      selectedCard =
        legendaryCards[Math.floor(Math.random() * legendaryCards.length)];
    }

    // UserCard 모델에 등록
    const userCard = await prisma.userCard.create({
      data: {
        user_id: user_id, // 파라미터에서 받은 user_id를 사용
        card_idx: selectedCard.idx,
      },
    });

    // 가챠 비용 차감
    await prisma.user.update({
      where: { id: user_id },
      data: {
        cash: user.cash - gachaCost,
      },
    });

    // 성공 응답
    return res.status(201).json({
      message: '가챠 성공!',
      card: selectedCard,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
