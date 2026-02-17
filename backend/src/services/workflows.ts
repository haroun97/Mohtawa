import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function createWorkflow(
  userId: string,
  data: { name: string; description?: string },
) {
  const workflow = await prisma.workflow.create({
    data: {
      name: data.name,
      description: data.description || null,
      status: "DRAFT",
      nodes: "[]",
      edges: "[]",
      userId,
    },
  });
  return formatWorkflow(workflow);
}

export async function listWorkflows(userId: string) {
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return workflows.map(formatWorkflow);
}

export async function getWorkflow(workflowId: string, userId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.userId !== userId)
    throw new AppError(403, "Access denied");

  return formatWorkflow(workflow);
}

export async function updateWorkflow(
  workflowId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    status?: string;
    nodes?: unknown[];
    edges?: unknown[];
  },
) {
  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!existing) throw new AppError(404, "Workflow not found");
  if (existing.userId !== userId)
    throw new AppError(403, "Access denied");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.nodes !== undefined) updateData.nodes = JSON.stringify(data.nodes);
  if (data.edges !== undefined) updateData.edges = JSON.stringify(data.edges);

  const workflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: updateData,
  });

  return formatWorkflow(workflow);
}

export async function deleteWorkflow(workflowId: string, userId: string) {
  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!existing) throw new AppError(404, "Workflow not found");
  if (existing.userId !== userId)
    throw new AppError(403, "Access denied");

  await prisma.workflow.delete({ where: { id: workflowId } });
}

export async function duplicateWorkflow(workflowId: string, userId: string) {
  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!existing) throw new AppError(404, "Workflow not found");
  if (existing.userId !== userId)
    throw new AppError(403, "Access denied");

  const copy = await prisma.workflow.create({
    data: {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      status: "DRAFT",
      nodes: existing.nodes,
      edges: existing.edges,
      userId,
    },
  });

  return formatWorkflow(copy);
}

function formatWorkflow(wf: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  nodes: string;
  edges: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    status: wf.status,
    nodes: JSON.parse(wf.nodes),
    edges: JSON.parse(wf.edges),
    userId: wf.userId,
    createdAt: wf.createdAt.toISOString(),
    updatedAt: wf.updatedAt.toISOString(),
  };
}
