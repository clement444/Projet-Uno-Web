import db from "../../utils/db";
import { generate_token } from "../../utils/auth";

export async function createUser(username, password) {
  const { clean_username, clean_password } = cleanCredentials(
    username,
    password,
  );

  if (!clean_username || !clean_password)
    throw new Error({
      status_code: 400,
      message: "Username and password is required.",
    });

  if (username.length > 20)
    throw new Error({ status_code: 400, message: "Username too long." });

  const hashed = await Bun.password.hash(clean_password);

  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    );

    const result = stmt.run(clean_username, hashed);
    const token = generate_token(result.lastInsertRowid);

    return { status_code: 201, token };
  } catch (err) {
    console.error("createUser error:", err);

    if (err.message?.includes("UNIQUE constraint failed")) {
      throw new Error({ status_code: 409, message: "Username already taken." });
    }

    throw new Error({ status_code: 500, message: "Cannot create account." });
  }
}

export async function loginUser(username, password) {
  const { clean_username, clean_password } = cleanCredentials(
    username,
    password,
  );

  if (!clean_username || !clean_password)
    throw new Error({
      status_code: 400,
      message: "Username and password is required.",
    });

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(clean_username);
  if (!user) {
    throw new Error({
      status_code: 401,
      message: "Wrong credentials.",
    });
  }

  const valid = await Bun.password.verify(clean_password, user.password_hash);
  if (!valid) {
    throw new Error({
      status_code: 401,
      message: "Wrong credentials.",
    });
  }

  const token = generate_token(user.id);
  return {
    status_code: 200,
    token,
  };
}

export function removeUser() {}

function cleanCredentials(username, password) {
  const cleanup_username = !username
    ? null
    : username.trim() === ""
      ? null
      : username.trim();

  const cleanup_password = !password
    ? null
    : password.trim() === ""
      ? null
      : password.trim();

  return {
    username: cleanup_username,
    password: cleanup_password,
  };
}
