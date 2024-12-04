// src/validation/auth.validation.js
import Joi from 'joi';

//---- joi 라이브러리를 사용하여 회원가입(아이디 생성)에 필요한 유효성 검사 스키마를 생성하시면 됩니다.

//---- 회원가입(아이디 생성) 스키마
export const testSchema = Joi.object({

    if(password.length<6){
        return resizeBy.status(400).json({message:"비밀번호는 최소 6자 이상이어야 합니다."});
    }
    
    if(password !== confirmPassword){
        return res.status(400).json({message:"비밀번호와 비밀번호 확인이 일치하지않습니다"});
    }



});

