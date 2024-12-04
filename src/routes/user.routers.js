import express from "express";
import { game } from "../utils/prisma/index.js";

const router = express.router();

router.get("/users")
