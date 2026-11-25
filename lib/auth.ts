import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { bearer, emailOTP } from "better-auth/plugins";
import { createElement } from "react";

import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { activarPerfilConfirmado } from "@/lib/auth/perfil";
import { enviarEmailAuth } from "@/lib/email/auth";
import CodigoRecuperacionEmail from "@/emails/auth-codigo-recuperacion";
import ConfirmarCuentaEmail from "@/emails/auth-confirmar-cuenta";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// El envio no se espera (await) a proposito: no revelar por tiempo de respuesta si el email
// existe. Si falla, queda en el log del servidor; el usuario puede pedir otro mail.
function enSegundoPlano(tarea: Promise<void>, etiqueta: string) {
  void tarea.catch((err) => console.error(`${etiqueta}:`, err));
}

type DbParaAuth = Parameters<typeof drizzleAdapter>[0];
type Enviar = typeof enviarEmailAuth;

// Fabrica: la instancia real (abajo) usa pg + Resend; los tests inyectan PGlite y un mail falso.
export function crearAuth(opts: { db: DbParaAuth; enviarEmail?: Enviar }) {
  const enviarEmail = opts.enviarEmail ?? enviarEmailAuth;
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? siteUrl,
    database: drizzleAdapter(opts.db, { provider: "pg", schema }),
    // user.id == profiles.id: Better Auth genera uuid y al importar se conserva el de Supabase.
    advanced: { database: { generateId: "uuid" } },
    trustedOrigins: [siteUrl],
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },

    emailAndPassword: {
      enabled: true,
      // Confirmar el email activa la cuenta (ver emailVerification.afterEmailVerification).
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: hashPassword,
        // Los usuarios importados de Supabase traen hash bcrypt ($2a$/$2b$); los nuevos usan scrypt.
        verify: async ({ hash, password }) =>
          hash.startsWith("$2")
            ? bcrypt.compare(password, hash)
            : verifyPassword({ hash, password }),
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      // No usamos `url` (GET que consume el token al abrirlo): un link preview del cliente de
      // mail lo quemaria. La pagina /auth/confirmar pide un click explicito y recien ahi verifica.
      sendVerificationEmail: async ({ user, token }) => {
        const url = `${siteUrl}/auth/confirmar?token=${encodeURIComponent(token)}`;
        enSegundoPlano(
          enviarEmail({
            to: user.email,
            subject: "Confirmá tu cuenta de VIMET",
            react: createElement(ConfirmarCuentaEmail, {
              nombre: user.name,
              url,
            }),
          }),
          "sendVerificationEmail",
        );
      },
      afterEmailVerification: async (user) => {
        await activarPerfilConfirmado(user.id, opts.db as typeof db);
      },
    },

    plugins: [
      // Recuperacion por codigo de 8 digitos (no por link: ver actions/auth.ts).
      emailOTP({
        otpLength: 8,
        expiresIn: 60 * 30,
        allowedAttempts: 5,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "forget-password") return;
          enSegundoPlano(
            enviarEmail({
              to: email,
              subject: "Tu código para recuperar la contraseña",
              react: createElement(CodigoRecuperacionEmail, { codigo: otp }),
            }),
            "sendVerificationOTP",
          );
        },
      }),
      // App mobile: sesion por `Authorization: Bearer <token>` (el token llega en el header `set-auth-token`).
      bearer(),
      nextCookies(), // siempre el ultimo plugin
    ],
  });
}

export const auth = crearAuth({ db });
export type Auth = typeof auth;
