import { Router } from 'express';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import Joi from 'joi';

const router = Router();

//유효성 검사
const numberSchema = Joi.number().required().strict();

// 상수 값

// 스탯 가중치
const ATTACK_WEIGHT = [0.3, 0.2];
const DEFENSE_WEIGHT = [0.2, 0.3];

// 팀 선수 명수
const HEADCOUNT = 3;

// 진영 가중치
const TEAM_COLOR_WEIGHT = [0, 13, 20];

// #region 게임 로직
router.post('/game:user_id', async (req, res, next) => {
  //인증 미들웨어 넣기
  try {
    const { user_id } = req.params;

    // 데이터 검사
    if (!req.user)
      return res.status(400).json({ message: '로그인 후 이용해주세요.' });

    const validation = await numberSchema.validateAsync(+user_id);

    if (req.user.idx === user_id)
      return res
        .status(400)
        .json({ message: '자기 자신 이외의 유저를 선택하세요.' });

    // #region 카드 받아오기
    const users = [req.user.idx, user_id];

    const decks = await prisma.deck.findMany({
      where: {
        user_id: {
          in: users,
        },
      },
      select: {
        card_1_idx: true,
        card_2_idx: true,
        card_3_idx: true,
      },
    });

    if (decks.length !== 2)
      return res.status(401).json({ message: '덱이 없는 사용자가 있습니다.' });

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

    // 스쿼드 스탯 별 공&방 기본 점수 계산
    let {aTeamAttackRatio, bTeamAttackRatio, aTeamDeffenseRatio, bTeamDeffenseRatio} = getRate(aTeamCards, bTeamCards);

    // 공격 수비 포지션별 확률 조정
    let positions = [0, 0, 0, 0]; // a공, b공, a수, b수
    let team_colors = [{}, {}];

    for (let i = 0; i < HEADCOUNT; i++) {
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

    // 포지션 별 확률 조정
    aTeamAttackRatio += 10 * positions[0] - 10 * positions[2];
    bTeamAttackRatio += 10 * positions[1] - 10 * positions[3];

    aTeamDeffenseRatio += 10 * positions[2] - 10 * positions[0];
    bTeamDeffenseRatio += 10 * positions[3] - 10 * positions[1];

    // 진영별 확률 조정
    if (team_colors[0].length < 3) {
      for (const key in team_colors[0]) {
        const item = team_colors[0][key];

        aTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
        aTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
      }
    }

    if (team_colors[1].length < 3) {
      for (const key in team_colors[1]) {
        const item = team_colors[1][key];

        bTeamAttackRatio += TEAM_COLOR_WEIGHT[item];
        bTeamDeffenseRatio += TEAM_COLOR_WEIGHT[item];
      }
    }


    /** 경기 시작 */
    let aScore = 0;
    let bScore = 0;

    for (let turn = 1; turn <= maxTurns; turn++) {
      // A팀 공격, B팀 방어
      if (Math.random() < aTeamAttackRatio) {
        if (Math.random() >= bTeamDeffenseRatio) {
          aScore +=1; // A팀 득점
        }
      }

      // B팀 공격, A팀 방어
      if (Math.random() < bTeamAttackRatio) {
        if (Math.random() >= aTeamDeffenseRatio) {
          bScore +=1; // B팀 득점
        }
      }
    }

    


  } catch (err) {
    next(err);
  }
});
// #endregion

// #region 스탯으로 공격 수비 확률 계산
function getRate(aTeamCards, bTeamCards) {
  let aSum = {
    tackle: 0,
    physical: 0,
    power: 0,
    dribble: 0,
  };

  let bSum = {
    tackle: 0,
    physical: 0,
    power: 0,
    dribble: 0,
  };

  //전부 더하기
  for (let i = 0; i < HEADCOUNT; i++) {
    aSum.tackle += aTeamCards[i].tackle;
    bSum.tackle += bTeamCards[i].tackle;

    aSum.physical += aTeamCards[i].physical;
    bSum.physical += bTeamCards[i].physical;

    aSum.power += aTeamCards[i].power;
    bSum.power += bTeamCards[i].power;

    aSum.dribble += aTeamCards[i].dribble;
    bSum.dribble += bTeamCards[i].dribble;
  }

  // 가중치 계산
  aSum.tackle *= DEFENSE_WEIGHT[0];
  bSum.tackle *= DEFENSE_WEIGHT[0];

  aSum.physical *= DEFENSE_WEIGHT[1];
  bSum.physical *= DEFENSE_WEIGHT[1];

  aSum.power *= ATTACK_WEIGHT[0];
  bSum.power *= ATTACK_WEIGHT[0];

  aSum.dribble *= ATTACK_WEIGHT[1];
  bSum.dribble *= ATTACK_WEIGHT[1];

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

export default router;
