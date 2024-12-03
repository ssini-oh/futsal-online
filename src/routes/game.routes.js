import { Router } from 'express';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import Joi from 'joi';

const router = Router();

const numberSchema = Joi.number().required().strict();

// #region 게임 로직
router.post('/game:user_id', async (req, res, next) => {
  //인증 미들웨어 넣기
  try {
    const { user_id } = req.params;

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
      select : {
        card_1_idx : true,
        card_2_idx : true,
        card_3_idx : true,
      }
    });

    if(decks.length !== 2) return res.status(401).json({message : "덱이 없는 사용자가 있습니다."});

    const aTeamCards = await prisma.card.findMany({
      where: {
        idx : {
          in : decks[0]
        }
      },
      select : {
        idx : true,
        name : true,

        tackle : true,
        Physical : true,

        power : true,
        dribble : true,

        team_color : true,
        grade : true,
        type : true,
      }
    });

    if(aTeamCards.length !== 3) return res.status(401).json({message : "도전자의 덱에 선수 수가 맞지 않습니다."});

    const bTeamCards = await prisma.card.findMany({
      where: {
        idx : {
          in : decks[1]
        }
      },
      select : {
        idx : true,
        name : true,

        tackle : true,
        Physical : true,

        power : true,
        dribble : true,
        
        team_color : true,
        grade : true,
        type : true,
      }
    });

    if(bTeamCards.length !== 3) return res.status(401).json({message : "상대방의 덱에 선수 수가 맞지 않습니다."});

    // #endregion

    



    // 경기 시작

    // 스쿼드 스탯 별 공&방 기본 점수 계산

    //
  } catch (err) {
    next(err);
  }
});
// #endregion

export default router;
