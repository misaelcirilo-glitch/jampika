import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import type { AuthPayload } from '../../middleware/auth.js'

export interface LoginInput {
  email: string
  password: string
  deviceId?: string
}

export interface RegisterClinicInput {
  clinicName: string
  slug: string
  country: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}

function signAccess(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
}

function signRefresh(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, isActive: true },
    include: { clinic: true },
  })
  if (!user) throw new Error('Credenciales inválidas')

  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) throw new Error('Credenciales inválidas')

  const payload: AuthPayload = {
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    email: user.email,
  }
  const accessToken = signAccess(payload)
  const refreshToken = signRefresh(user.id)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      deviceId: input.deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clinicId: user.clinicId,
    },
    clinic: {
      id: user.clinic.id,
      name: user.clinic.name,
      slug: user.clinic.slug,
      country: user.clinic.country,
      plan: user.clinic.plan,
    },
  }
}

export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Refresh token inválido')
  }
  try {
    jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
  } catch {
    throw new Error('Refresh token inválido')
  }
  const payload: AuthPayload = {
    userId: stored.user.id,
    clinicId: stored.user.clinicId,
    role: stored.user.role,
    email: stored.user.email,
  }
  return { accessToken: signAccess(payload) }
}

export async function registerClinic(input: RegisterClinicInput) {
  const existing = await prisma.clinic.findUnique({ where: { slug: input.slug } })
  if (existing) throw new Error('El identificador de clínica ya existe')

  const passwordHash = await bcrypt.hash(input.adminPassword, 10)
  const ownerId = randomUUID()

  const clinic = await prisma.clinic.create({
    data: {
      name: input.clinicName,
      slug: input.slug,
      ownerId,
      country: input.country,
      users: {
        create: {
          id: ownerId,
          email: input.adminEmail,
          passwordHash,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          role: 'admin',
        },
      },
    },
    include: { users: true },
  })
  return clinic
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  })
}
