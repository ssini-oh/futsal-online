import express from "express";
import { prisma } from "../utils/prisma/index.js"

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

export default router;
// router.get('./users/battle-log/:userId', async (req, res, next) => {
//     const userId = parseInt(req.params.id, 10);
//     try {
//         const battleLog = await prisma.game.
//     }
// })