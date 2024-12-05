import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMidWare from '../middlewares/auth.middleware.js';

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
    next(error);
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
    next(error);
  }
});

router.post('/users/:user_id/cards', authMidWare, async (req, res, next) => {
  try {
    const userId = req.params.user_id; // URL 경로에서 user_id 가져오기
    const gachaCost = 500; // 가챠 비용

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: '로그인 후 이용해주세요.' });
    }

    // 가챠 비용 확인
    if (user.cash < gachaCost) {
      return res
        .status(400)
        .json({ message: '뽑기를 하기 위한 골드가 부족합니다.' });
    }

    // 랜덤 숫자 생성 (0~100 사이)
    const random = Math.random() * 100; // 0.0 ~ 100.0
    let selectedGrade;

    // 등급 확률에 따른 결정
    if (random < 70) {
      selectedGrade = 'NORMAL'; // 70%
    } else if (random < 95) {
      selectedGrade = 'RARE'; // 25% (70 ~ 95)
    } else if (random < 99.5) {
      selectedGrade = 'EPIC'; // 4.5% (95 ~ 99.5)
    } else {
      selectedGrade = 'LEGENDARY'; // 0.5% (99.5 ~ 100)
    }

    // 해당 등급의 카드 중 랜덤 선택
    const cardsByGrade = await prisma.card.findMany({
      where: { grade: selectedGrade },
    });

    const randomCard =
      cardsByGrade[Math.floor(Math.random() * cardsByGrade.length)];

    // UserCard 테이블에 카드 추가
    const userCard = await prisma.userCard.create({
      data: {
        user_id: userId,
        card_idx: randomCard.idx,
      },
    });

    // 유저 캐시 차감//
    await prisma.user.update({
      where: { id: userId },
      data: { cash: user.cash - gachaCost },
    });

    // 가챠 결과 반환
    return res.status(200).json({
      message: '선수카드를 뽑았습니다!',
      data: {
        grade: selectedGrade,
        card: randomCard,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/users/:user_id/cards/batch',
  authMidWare,
  async (req, res, next) => {
    try {
      const userId = req.params.user_id; // URL 경로에서 user_id 가져오기
      const gachaCost = 400; // 한 장당 가챠 비용
      const count = 5; // 한번에 뽑는 카드 수
      const totalCost = gachaCost * count; // 총 가챠 비용

      // 사용자 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: '로그인 후 이용해주세요.' });
      }

      // 가챠 비용 확인
      if (user.cash < totalCost) {
        return res
          .status(400)
          .json({ message: '5회 가챠를 하기 위한 골드가 부족합니다.' });
      }

      const gachaResults = []; // 가챠 결과를 저장할 배열

      // 5번 가챠 실행
      for (let i = 0; i < count; i++) {
        // 랜덤 숫자 생성 (0~100 사이)
        const random = Math.random() * 100; // 0.0 ~ 100.0
        let selectedGrade;

        // 등급 확률에 따른 결정
        if (random < 70) {
          selectedGrade = 'NORMAL'; // 70%
        } else if (random < 95) {
          selectedGrade = 'RARE'; // 25% (70 ~ 95)
        } else if (random < 99.5) {
          selectedGrade = 'EPIC'; // 4.5% (95 ~ 99.5)
        } else {
          selectedGrade = 'LEGENDARY'; // 0.5% (99.5 ~ 100)
        }

        // 해당 등급의 카드 중 랜덤 선택
        const cardsByGrade = await prisma.card.findMany({
          where: { grade: selectedGrade },
        });

        const randomCard =
          cardsByGrade[Math.floor(Math.random() * cardsByGrade.length)];

        // UserCard 테이블에 카드 추가
        const userCard = await prisma.userCard.create({
          data: {
            user_id: userId,
            card_idx: randomCard.idx,
          },
        });

        // 가챠 결과 저장
        gachaResults.push({
          grade: selectedGrade,
          card: randomCard,
        });
      }

      // 유저 캐시 차감
      await prisma.user.update({
        where: { id: userId },
        data: { cash: user.cash - totalCost },
      });

      // 가챠 결과 반환
      return res.status(200).json({
        message: `${count}장의 선수카드를 뽑았습니다!`,
        data: gachaResults,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
