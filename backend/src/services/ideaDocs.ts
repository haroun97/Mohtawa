import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

const DEFAULT_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

export async function listIdeaDocs(
  userId: string,
  options: { trash?: boolean } = {},
) {
  const where: { userId: string; deletedAt: unknown } = {
    userId,
    deletedAt: options.trash ? { not: null } : null,
  };
  return prisma.ideaDoc.findMany({
    where,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createIdeaDoc(userId: string, title?: string) {
  return prisma.ideaDoc.create({
    data: {
      userId,
      title: title?.trim() || "Untitled",
      content: DEFAULT_CONTENT,
    },
  });
}

export async function getIdeaDoc(id: string, userId: string) {
  const doc = await prisma.ideaDoc.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!doc) throw new AppError(404, "Document not found");
  return doc;
}

export async function getIdeaDocForExecution(id: string, userId: string) {
  const doc = await prisma.ideaDoc.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!doc) return null;
  return { title: doc.title, content: doc.content };
}

export async function updateIdeaDoc(
  id: string,
  userId: string,
  data: { title?: string; content?: object },
) {
  await getIdeaDoc(id, userId);
  return prisma.ideaDoc.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() || "Untitled" }),
      ...(data.content !== undefined && { content: data.content as object }),
    },
  });
}

export async function deleteIdeaDoc(
  id: string,
  userId: string,
  permanent?: boolean,
) {
  const doc = await prisma.ideaDoc.findFirst({
    where: { id, userId },
  });
  if (!doc) throw new AppError(404, "Document not found");
  if (permanent) {
    await prisma.ideaDoc.delete({ where: { id } });
    return { deleted: true, permanent: true };
  }
  await prisma.ideaDoc.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return { deleted: true, permanent: false };
}

export async function restoreIdeaDoc(id: string, userId: string) {
  const doc = await prisma.ideaDoc.findFirst({
    where: { id, userId },
  });
  if (!doc) throw new AppError(404, "Document not found");
  if (!doc.deletedAt) throw new AppError(400, "Document is not in Trash");
  return prisma.ideaDoc.update({
    where: { id },
    data: { deletedAt: null },
  });
}
