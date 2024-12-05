import express from "express";
import { prisma } from "../utils/prisma/index.js" // post 에서 만든거 사용함
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/users', async (req, res) => {
    try {
        const allUsers = await prisma.user.findMany({
            select: {
                username: true,
                wins: true,
                losses: true,
            },
        });

        return res.status(200).json(allUsers);
    } catch (error) {
        console.error("아이탬 목록 조회 중 에러 발생: ", error);
        if (!allUsers) {
            return res
                .status(404)
                .json({ massage: "유저 목록 조회중 오래구 발생하였습니다." })
        }
    }
});

router.get('/users/:userId/cards',authMiddleware, async (req, res) => {
    const {userId} = req.params;

    try {
        //아이디 일치 판정
        if(userId !== req.user.id) return res.status(401).json({message : "다른 유저의 보유 카드입니다."});

        //카드 아이디 받아오기
        const cardIdxs = await prisma.userCard.findMany({
            where : {
                user_id : userId
            },
            select: {
                card_idx : true,
            },
        });

        if(!cardIdxs) return res.status(200).json({message : "보유 카드가 없습니다."});

        //객체 -> 배열
        const Idxs = cardIdxs.map(item => item.card_idx);

        //카드 정보 받아오기
        const userCards = await prisma.card.findMany({
            where : {
                idx : {
                    in : Idxs
                }
            },
            select: {
                name: true,
                Physical: true,
                power : true,
                dribble : true,
                team_color : true,
                grade : true,
                type : true
            },
        });

        return res.status(200).json(userCards);
    } catch (error) {
        console.error("보유 카드 검색 중 에러 발생: ", error);
        
        next(error);
    }
});

export default router;