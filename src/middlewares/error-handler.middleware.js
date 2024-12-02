const errorHandlerMiddleware = (err, req, res, next) => {
  console.error(err);

  // Joi ValidationError 처리
  if (err.name === 'ValidationError') {
    return res.status(400).json({ errorMessage: err.details[0].message });
  }

  // JWT 토큰 검증 에러 처리
  if (err.name === 'TokenExpiredError') {
    console.log('유효하지 않은 토큰입니다.', err.message);
    return res
      .status(401)
      .json({ errorMessage: '올바르지 않은 인증 요청입니다.' });
  }

  return res
    .status(500)
    .json({ errorMessage: '서버에서 에러가 발생했습니다.' });
};

export default errorHandlerMiddleware;
