import prisma from "../config/database.config";

export async function getUserNameById(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, username: true },
  });
  if (!user) {
    return userId;
  } else if (user.fullName) {
    return user.fullName;
  } else return user.username;
}
