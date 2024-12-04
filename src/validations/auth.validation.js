// src/validation/auth.validation.js
import Joi from 'joi';

//---- joi 라이브러리를 사용하여 회원가입(아이디 생성)에 필요한 유효성 검사 스키마를 생성하시면 됩니다.

//---- 회원가입(아이디 생성) 스키마
export const testSchema = Joi.object({
  passowrd: Joi.string().min(6).max(10).required().message({
    'string.min': '비밀번호는 최소 6글자 이상이어야합니다.',
    'string.max': '비밀번호는 10글자를 넘길수없습니다',
    'any.required':'비밀번호를 다시입력해주세요',
  }),
});
testSchema.validate({passowrd:123456})
