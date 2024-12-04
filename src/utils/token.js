import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateToken = (userId) => {
  const token = jwt.sign{
    UserId: User.userId,
  }
    
};



// a = user.id
// function Test(a) {
//   console.log(a);    
// }


// const user = {
//   id = 100
// }
// Test(user.id)
