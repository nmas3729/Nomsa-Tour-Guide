import "server-only";

import argon2 from "argon2";

const argonOptions: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argonOptions);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "auth.password.verify_error",
        error: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return false;
  }
}
