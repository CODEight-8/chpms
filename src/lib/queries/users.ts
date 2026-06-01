import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface UserFilters {
  search?: string;
  active?: boolean;
}

interface PageOpts {
  skip?: number;
  take?: number;
}

export async function getUsers(filters?: UserFilters, page?: PageOpts) {
  const where: Prisma.UserWhereInput = {};

  if (filters?.active !== undefined) {
    where.isActive = filters.active;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
      skip: page?.skip,
      take: page?.take,
    }),
    prisma.user.count({ where }),
  ]);

  return { rows, total };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
