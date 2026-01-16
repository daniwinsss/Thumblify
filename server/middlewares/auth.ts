import { Request, Response, NextFunction } from 'express';

const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { isLoggedIn, userId } = req.session as {
    isLoggedIn?: boolean;
    userId?: string;
  };

  if (!isLoggedIn || !userId) {
    return res.status(401).json({
      message: 'You are not logged in',
    });
  }

  next();
};

export default protect;
