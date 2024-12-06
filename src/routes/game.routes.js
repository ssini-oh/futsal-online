import { Router } from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { stringSchema } from '../validations/auth.validation.js';

const router = Router();

// #region 상수 값

// 스탯 가중치
const ATTACK_WEIGHT = [0.3, 0.2]; // power, dribble
const DEFENSE_WEIGHT = [0.2, 0.3]; // tackle, physical

// 진영 가중치
const TEAM_COLOR_WEIGHT = [0, 0, 13, 20];

// 포지션 버프량
const POSITION_WEIGHT = 5;

// 팀 선수 명수
const HEADCOUNT = 3;

// 라운드 수
const MAX_ROUND = 15;

// 확률 최대 최소
const MAX_RATE = 99;
const MIN_RATE = 1;

// #endregion

// #region 게임 로직
router.post('/game/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 데이터 검사
    if (!req.user)
      return res.status(401).json({ message: '로그인 후 이용해주세요.' });

    const validation = await stringSchema.validateAsync(userId);

    if (req.user.id === userId)
      return res.status(401).json({ message: '본인 외의 유저를 선택하세요.' });

    // #region 카드 받아오기
    const users = [req.user.id, userId]; // 내 아이디, 상대방 아이디

    const cards = await prisma.deck.findMany({
      where: {
        user_id: {
          in: users,
        },
      },
      select: {
        user_id: true,
        card_1_idx: true,
        card_2_idx: true,
        card_3_idx: true,
      },
    });

    if (cards.length !== 2)
      return res.status(400).json({ message: '덱이 없는 사용자가 있습니다.' });

    // 배열로 바꾸기
    let decks = [];

    // users를 순회하며 각 유저의 카드를 검색
    for (const user of users) {
      // cards 배열에서 해당 유저의 데이터를 검색
      const userCards = cards.find((card) => card.user_id === user);

      if (userCards) {
        // 카드 인덱스를 배열로 변환
        const cardIndexes = [
          userCards.card_1_idx,
          userCards.card_2_idx,
          userCards.card_3_idx,
        ].filter((card) => card !== null); // null 값 제거

        // decks 배열에 추가
        decks.push(cardIndexes);
      } else {
        // 유저에 해당하는 카드가 없으면 빈 배열 추가
        decks.push([]);
      }
    }

    const aTeamCards = await prisma.card.findMany({
      where: {
        idx: {
          in: decks[0],
        },
      },
      select: {
        idx: true,
        name: true,

        tackle: true,
        physical: true,

        power: true,
        dribble: true,

        team_color: true,
        grade: true,
        type: true,
      },
    });

    if (aTeamCards.length !== 3)
      return res
        .status(400)
        .json({ message: '도전자의 덱에 선수 수가 맞지 않습니다.' });

    const bTeamCards = await prisma.card.findMany({
      where: {
        idx: {
          in: decks[1],
        },
      },
      select: {
        idx: true,
        name: true,

        tackle: true,
        physical: true,

        power: true,
        dribble: true,

        team_color: true,
        grade: true,
        type: true,
      },
    });

    if (bTeamCards.length !== 3)
      return res
        .status(400)
        .json({ message: '상대방의 덱에 선수 수가 맞지 않습니다.' });

    // #endregion

    /** 확률 계산  */

    // 포지션 (각 팀의 공격수, 수비수 수)
    let positions = [0, 0, 0, 0]; // a공, b공, a수, b수

    // 진영
    let teamColors = [{}, {}];

    // 스탯 모음
    let statSums = [
      { tackle: 0, physical: 0, power: 0, dribble: 0 },
      { tackle: 0, physical: 0, power: 0, dribble: 0 },
    ];

    // 카드 정보 받아오기
    getInfos(aTeamCards, bTeamCards, positions, teamColors, statSums);

    console.log(aTeamCards, bTeamCards);

    // 스쿼드 스탯 별 공&방 기본 점수 계산
    let rates = getRate(statSums);

    console.log(rates);

    // 포지션 별 확률 조정
    applyPositions(rates, positions);

    console.log(rates);

    // 진영별 확률 조정
    applyTeamColors(rates, teamColors);

    console.log(rates);

    //확률 최대 최소 보정
    calibrateRates(rates);

    console.log(rates);

    /** 경기 시작 */
    const { aScore, bScore } = game(rates);

    //경기 결과 기록
    await prisma.game.create({
      data: {
        team_a_user_id: users[0],
        team_b_user_id: users[1],
        team_a_score: aScore,
        team_b_score: bScore,
      },
    });

    // 결과 반환
    const result = aScore > bScore ? 'WIN' : aScore < bScore ? 'LOSE' : 'DRAW';

    return res
      .status(201)
      .json({ result: result, a_team_score: aScore, b_team_score: bScore });
  } catch (error) {
    next(error);
  }
});
// #endregion

//---- 특정 사용자 배틀 로그 조회 API
router.get('/games/battle-log/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    // 해당 유저가 존재하는지 확인
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res
        .status(404)
        .json({ message: '해당 유저가 존재하지 않습니다.' });
    }

    // 특정 사용자 배틀 로그 조회
    const battleLog = await prisma.game.findMany({
      where: { OR: [{ team_a_user_id: userId }, { team_b_user_id: userId }] },
      select: {
        team_a_user_id: true,
        team_b_user_id: true,
        team_a_score: true,
        team_b_score: true,
        played_at: true,
      },
    });

    if (!battleLog) {
      return res
        .status(404)
        .json({ message: '해당 유저는 대전기록이 없습니다.' });
    }

    // 성공 응답 반환
    return res.status(200).json(battleLog);
  } catch (error) {
    next(error);
  }
});

// #endregion

// #region 팀 정보 추출
function getInfos(aTeamCards, bTeamCards, positions, teamColors, statSums) {
  for (let i = 0; i < HEADCOUNT; i++) {
    // 스탯 검사
    statSums[0].tackle += aTeamCards[i].tackle;
    statSums[1].tackle += bTeamCards[i].tackle;

    statSums[0].physical += aTeamCards[i].physical;
    statSums[1].physical += bTeamCards[i].physical;

    statSums[0].power += aTeamCards[i].power;
    statSums[1].power += bTeamCards[i].power;

    statSums[0].dribble += aTeamCards[i].dribble;
    statSums[1].dribble += bTeamCards[i].dribble;

    // 포지션 검사
    if (aTeamCards[i].type === 'ATTACKER') positions[0] += 1;
    else positions[2] += 1;

    if (bTeamCards[i].type === 'ATTACKER') positions[1] += 1;
    else positions[3] += 1;

    // 진영 검사
    const aTeamColor = aTeamCards[i].team_color;
    if (teamColors[0][aTeamColor]) teamColors[0][aTeamColor] += 1;
    else teamColors[0][aTeamColor] = 1;

    const bTeamColor = bTeamCards[i].team_color;
    if (teamColors[1][bTeamColor]) teamColors[1][bTeamColor] += 1;
    else teamColors[1][bTeamColor] = 1;
  }
}
// #endregion

// #region 스탯으로 공격 수비 확률 계산
function getRate(statSums) {
  console.log(statSums);

  // 가중치 계산
  statSums[0].tackle = Math.floor(statSums[0].tackle * DEFENSE_WEIGHT[0]);
  statSums[1].tackle = Math.floor(statSums[1].tackle * DEFENSE_WEIGHT[0]);

  statSums[0].physical = Math.floor(statSums[0].physical * DEFENSE_WEIGHT[1]);
  statSums[1].physical = Math.floor(statSums[1].physical * DEFENSE_WEIGHT[1]);

  statSums[0].power = Math.floor(statSums[0].power * ATTACK_WEIGHT[0]);
  statSums[1].power = Math.floor(statSums[1].power * ATTACK_WEIGHT[0]);

  statSums[0].dribble = Math.floor(statSums[0].dribble * ATTACK_WEIGHT[1]);
  statSums[1].dribble = Math.floor(statSums[1].dribble * ATTACK_WEIGHT[1]);

  const aTeamDeffenseRatio = Math.floor(
    (statSums[0].tackle + statSums[0].physical) / 2
  );
  const bTeamDeffenseRatio = Math.floor(
    (statSums[1].tackle + statSums[1].physical) / 2
  );

  const aTeamAttackRatio = Math.floor(
    (statSums[0].power + statSums[0].physical) / 2
  );
  const bTeamAttackRatio = Math.floor(
    (statSums[1].power + statSums[1].physical) / 2
  );

  console.log(statSums);

  return {
    aTeamAttackRatio,
    bTeamAttackRatio,
    aTeamDeffenseRatio,
    bTeamDeffenseRatio,
  };
}
// #endregion

// #region 포지션 별 확률 조정
function applyPositions(rates, positions) {
  rates.aTeamAttackRatio += POSITION_WEIGHT * (positions[0] - positions[2]);
  rates.bTeamAttackRatio += POSITION_WEIGHT * (positions[1] - positions[3]);

  rates.aTeamDeffenseRatio += POSITION_WEIGHT * (positions[2] - positions[0]);
  rates.bTeamDeffenseRatio += POSITION_WEIGHT * (positions[3] - positions[1]);
}
// #endregion

// #region 진영 별 확률 조정
function applyTeamColors(rates, teamColors) {
  for (const key in teamColors[0]) {
    const item = teamColors[0][key];

    rates.aTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
    rates.aTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
  }

  for (const key in teamColors[1]) {
    const item = teamColors[1][key];

    rates.bTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
    rates.bTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
  }
}
// #endregion

// #region 경기 진행
function game(rates) {
  let aScore = 0;
  let bScore = 0;

  for (let round = 1; round <= MAX_ROUND; round++) {
    // A팀 공격, B팀 방어
    if (getRandomNum(1, 100) <= rates.aTeamAttackRatio) {
      if (getRandomNum(1, 100) >= rates.bTeamDeffenseRatio) {
        aScore += 1; // A팀 득점
      }
    }

    // B팀 공격, A팀 방어
    if (getRandomNum(1, 100) <= rates.bTeamAttackRatio) {
      if (getRandomNum(1, 100) >= rates.aTeamDeffenseRatio) {
        bScore += 1; // B팀 득점
      }
    }
  }

  return {
    aScore,
    bScore,
  };
}
// #endregion

// #region 확률 보정
function calibrateRates(rates) {
  for (const key in rates) {
    if (rates[key] > MAX_RATE) rates[key] = MAX_RATE;
    else if (rates[key] < MIN_RATE) rates[key] = MIN_RATE;
  }
}

// #endregion

// #region 랜덤 숫자 뽑기
function getRandomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// #endregion

export default router;
