import express from "express";
// import { prisma } from "../utils/prisma/index.js" // post 에서 만든거 사용함

const router = express.Router();

router.get('/users', async (req, res) => {
    try {
        const allUsers = await prismas.user.findMany({
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