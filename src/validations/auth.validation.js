// src/validation/auth.validation.js
import Joi from 'joi';

//---- joi 라이브러리를 사용하여 회원가입(아이디 생성)에 필요한 유효성 검사 스키마를 생성하시면 됩니다.

//---- 회원가입(아이디 생성) 스키마
export const testSchema = Joi.object({
  password: Joi.string().min(6).required().messages({
    'string.min': '비밀번호는 최소 6자 이상이어야 합니다.',
    'any.required': '비밀번호는 필수 항목입니다.',
  }),
  id: Joi.string()
    .pattern(/^[a-zA-Z][a-zA-Z0-9]{5,19}$/) // 영문자로 시작하고 6~20자
    .required()
    .messages({
      'string.pattern.base':
        '아이디는 영문자로 시작하는 6~20자 영문자 또는 숫자이어야 합니다',
      'any.required': '아이디는 필수 항목입니다',
    }),
});
