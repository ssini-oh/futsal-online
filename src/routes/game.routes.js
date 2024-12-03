import { Router } from 'express';
import { prisma } from '../utils/prisma/index.js';
import { generateToken } from '../utils/token.js';
import Joi from 'joi';

const router = Router();

const numberSchema = Joi.number().required().strict();

router.post('/game:user_id', async (req, res, next) => {    //인증 미들웨어 넣기
    try {
        const {user_id} = req.params;

    if(!req.user) return res.status(400).json({message : "로그인 후 이용해주세요."});

    const validation = await numberSchema.validateAsync(+user_id);

    if(req.user.idx === user_id) return res.status(400).json({message : "자기 자신 이외의 유저를 선택하세요."});

    
    

    } catch (err) {
        next(err);
    }
    

})

export default router;