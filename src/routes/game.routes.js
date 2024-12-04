import { Router } from 'express';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import Joi from 'joi';

const router = Router();

//유효성 검사
const stringSchema = Joi.string().required().strict();

// #region 상수 값

// 스탯 가중치
const ATTACK_WEIGHT = [0.3, 0.2];
const DEFENSE_WEIGHT = [0.2, 0.3];

// 진영 가중치
const TEAM_COLOR_WEIGHT = [0, 13, 20];

// 팀 선수 명수
const HEADCOUNT = 3;

// 라운드 수
const MAX_ROUND = 15;

const dummyIds = ['test002', 'test003'];

// #endregion

// #region 게임 로직
router.post('/game/:user_id', async (req, res, next) => {
  //인증 미들웨어 넣기
  try {
    // const { user_id } = req.params;

    // // 데이터 검사
    // if (!req.user)
    //   return res.status(400).json({ message: '로그인 후 이용해주세요.' });

    // const validation = await stringSchema.validateAsync(user_id);

    // if (req.user.idx === user_id)
    //   return res
    //     .status(400)
    //     .json({ message: '자기 자신 이외의 유저를 선택하세요.' });

    // #region 카드 받아오기
    //const users = [req.user.id, user_id]; //TODO 인증 미들웨어 변경 시 아이디 변경

    const cards = await prisma.deck.findMany({
      where: {
        user_id: {
          in: dummyIds,
        },
      },
      select: {
        card_1_idx: true,
        card_2_idx: true,
        card_3_idx: true,
      },
    });

    if (cards.length !== 2)
      return res.status(401).json({ message: '덱이 없는 사용자가 있습니다.' });

    //배열로 바꾸기
    let decks = [];

    for(const idx in cards) {
      const item = cards[idx];
      let tmp =[];

      for(const key in item) {
        tmp.push(item[key]);
      }

      decks.push(tmp);
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
        Physical: true,

        power: true,
        dribble: true,

        team_color: true,
        grade: true,
        type: true,
      },
    });

    if (aTeamCards.length !== 3)
      return res
        .status(401)
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
        Physical: true,

        power: true,
        dribble: true,

        team_color: true,
        grade: true,
        type: true,
      },
    });

    if (bTeamCards.length !== 3)
      return res
        .status(401)
        .json({ message: '상대방의 덱에 선수 수가 맞지 않습니다.' });

    // #endregion

    /** 확률 계산  */

    // 포지션
    let positions = [0, 0, 0, 0]; // a공, b공, a수, b수

    // 진영
    let team_colors = [{}, {}];

    // 스탯 모음
    let statSums = [
      { tackle: 0, physical: 0, power: 0, dribble: 0 },
      { tackle: 0, physical: 0, power: 0, dribble: 0 },
    ];

    // 카드 정보 받아오기
    getInfos(aTeamCards, bTeamCards, positions, team_colors, statSums);

    // 스쿼드 스탯 별 공&방 기본 점수 계산
    let rates = getRate(statSums);

    // 포지션 별 확률 조정
    applyPositions(rates, positions);

    // 진영별 확률 조정
    applyTeamColors(rates, team_colors);

    /** 경기 시작 */
    const { aScore, bScore } = game(rates);

    // 결과 반환
    const result = aScore > bScore ? 'WIN' : aScore < bScore ? 'LOSE' : 'DRAW';

    return res
      .status(201)
      .json({ result: result, a_team_score: aScore, b_team_score: bScore });
  } catch (err) {
    next(err);
  }
});
// #endregion

// #region 팀 정보 추출
function getInfos(aTeamCards, bTeamCards, positions, team_colors, statSums) {
  for (let i = 0; i < HEADCOUNT; i++) {
    //스탯 검사
    statSums[0].tackle += aTeamCards[i].tackle;
    statSums[1].tackle += bTeamCards[i].tackle;

    statSums[0].physical += aTeamCards[i].physical;
    statSums[1].physical += bTeamCards[i].physical;

    statSums[0].power += aTeamCards[i].power;
    statSums[1].power += bTeamCards[i].power;

    statSums[0].dribble += aTeamCards[i].dribble;
    statSums[1].dribble += bTeamCards[i].dribble;

    //포지션 검사
    if (aTeamCards[i].type === 'ATTACKER') positions[0] += 1;
    else positions[2] += 1;

    if (bTeamCards[i].type === 'ATTACKER') positions[1] += 1;
    else positions[3] += 1;

    //진영 검사
    const aTeamColor = aTeamCards[i].team_color;
    if (team_colors[0][aTeamColor]) team_colors[0][aTeamColor] += 1;
    else team_colors[0][aTeamColor] = 1;

    const bTeamColor = bTeamCards[i].team_color;
    if (team_colors[1][bTeamColor]) team_colors[1][bTeamColor] += 1;
    else team_colors[1][bTeamColor] = 1;
  }
}
// #endregion

// #region 스탯으로 공격 수비 확률 계산
function getRate(statSums) {
  // 가중치 계산
  statSums[0].tackle *= DEFENSE_WEIGHT[0];
  statSums[1].tackle *= DEFENSE_WEIGHT[0];

  statSums[0].physical *= DEFENSE_WEIGHT[1];
  statSums[1].physical *= DEFENSE_WEIGHT[1];

  statSums[0].power *= ATTACK_WEIGHT[0];
  statSums[1].power *= ATTACK_WEIGHT[0];

  statSums[0].dribble *= ATTACK_WEIGHT[1];
  statSums[1].dribble *= ATTACK_WEIGHT[1];

  const aTeamDeffenseRatio = Math.floor((aSum.tackle + aSum.physical) / 2);
  const bTeamDeffenseRatio = Math.floor((bSum.tackle + bSum.physical) / 2);

  const aTeamAttackRatio = Math.floor((aSum.power + aSum.physical) / 2);
  const bTeamAttackRatio = Math.floor((bSum.power + bSum.physical) / 2);

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
  rates.aTeamAttackRatio += 10 * positions[0] - 10 * positions[2];
  rates.bTeamAttackRatio += 10 * positions[1] - 10 * positions[3];

  rates.aTeamDeffenseRatio += 10 * positions[2] - 10 * positions[0];
  rates.bTeamDeffenseRatio += 10 * positions[3] - 10 * positions[1];
}
// #endregion

// #region 포지션 별 확률 조정
function applyTeamColors(rates, team_colors) {
  if (team_colors[0].length < 3) {
    for (const key in team_colors[0]) {
      const item = team_colors[0][key];

      rates.aTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
      rates.aTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
    }
  }

  if (team_colors[1].length < 3) {
    for (const key in team_colors[1]) {
      const item = team_colors[1][key];

      rates.bTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
      rates.bTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
    }
  }
}
// #endregion

// #region 스탯으로 공격 수비 확률 계산
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

// #region 랜덤 숫자 뽑기
function getRandomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// #endregion

export default router;
