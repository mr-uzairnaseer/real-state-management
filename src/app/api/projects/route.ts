import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, requireRole, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapProject, recalculateUnitAndGrey } from '@/lib/mappers';

export async function GET() {
  try {
    await requireUser();
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
    return json({ projects: projects.map(mapProject) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('admin');
    const body = await req.json();
    const stages = body.stageTemplates?.length
      ? body.stageTemplates
      : [
          { id: crypto.randomUUID(), name: 'Grey Structure', weight: 30, order: 1 },
          { id: crypto.randomUUID(), name: 'Finishing', weight: 70, order: 2 },
        ];
    const project = await prisma.project.create({
      data: {
        name: body.name,
        type: body.type ?? 'Real Estate',
        description: body.description ?? '',
        location: body.location ?? '',
        status: body.status ?? 'planning',
        totalBudget: Number(body.totalBudget) || 0,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null,
        managerIds: body.managerIds ?? [],
        stageTemplates: stages,
        greyStructure: body.greyStructure ?? {
          progress: 0,
          budget: 0,
          expenses: 0,
          completedWork: '',
          remainingWork: '',
          constructionStatus: 'Not Started',
          notes: '',
        },
        timelineNotes: body.timelineNotes ?? '',
      },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: {
        greyStructure: {
          ...(project.greyStructure as object),
          projectId: project.id,
        },
      },
    });
    await prisma.constructionTask.createMany({
      data: stages.map((st: { name: string; weight: number; order: number }) => ({
        projectId: project.id,
        name: st.name,
        weight: st.weight,
        progress: 0,
        status: 'not_started',
        comments: '',
        order: st.order,
      })),
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'project',
      entityId: project.id,
      newValue: project.name,
    });
    const full = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    return json({ project: mapProject(full) });
  } catch (err) {
    return handleApiError(err);
  }
}
