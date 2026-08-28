import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { AdminCreateUserInput, AdminUpdateUserInput, UserQueryInput } from '@/features/users/validators/user'

export async function createUserByAdmin(data: AdminCreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new ValidationError('User with this email already exists')
  }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: passwordHash,
      role: data.role,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      postalCode: data.postalCode ?? null,
      image: data.image ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      postalCode: true,
      createdAt: true,
    },
  })

  return user
}

export async function listUsers(query: UserQueryInput) {
  const { search, role } = query
  const page = Number((query as any).page) || 1
  const limit = Number((query as any).limit) || 12
  const skip = (page - 1) * limit

  const where: any = {}
  if (role) where.role = role
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customerType: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      postalCode: true,
      createdAt: true,
    },
  })
  if (!user) throw new NotFoundError('User not found')
  return user
}

export async function updateUserByAdmin(
  id: number,
  data: AdminUpdateUserInput
) {
  // If email change, ensure unique
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing && existing.id !== id) {
      throw new ValidationError('Email is already taken')
    }
  }

  let updateData: any = { ...data }
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12)
    // Stamps the reset so every JWT issued before now stops validating.
    updateData.passwordChangedAt = new Date()
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      postalCode: true,
      createdAt: true,
    },
  })

  return user
}

export async function deleteUserByAdmin(id: number) {
  // Will throw if not exists
  await prisma.user.delete({ where: { id } })
  return { message: 'User deleted successfully' }
}
