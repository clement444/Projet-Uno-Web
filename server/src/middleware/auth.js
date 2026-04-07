import { User } from "../structures/user/user";

export function check_auth(req, res, next) {
  const user = new User("1", "2", "3");

  const payload = {
    id: user.id,
    username: user.username,
  };

  res.locals.user = payload;

  next();
}
