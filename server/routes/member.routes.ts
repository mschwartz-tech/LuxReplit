
import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { insertMemberSchema, insertMemberAssessmentSchema } from "../../shared/schema";

export const memberRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const members = await storage.getMembers();
    logInfo("Members retrieved", { count: members.length });
    res.json(members);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Member creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const member = await storage.createMember(parsed.data);
    logInfo("New member created", { memberId: member.id });
    res.status(201).json(member);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const member = await storage.getMember(parseInt(req.params.id));
    if (!member) return res.sendStatus(404);
    logInfo("Member retrieved", { memberId: member.id });
    res.json(member);
  }),

  getAssessments: asyncHandler(async (req: Request, res: Response) => {
    const assessments = await storage.getMemberAssessments(parseInt(req.params.id));
    logInfo("Assessments retrieved", { memberId: req.params.id, count: assessments.length });
    res.json(assessments);
  }),

  createAssessment: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberAssessmentSchema.safeParse({ 
      ...req.body, 
      memberId: parseInt(req.params.id) 
    });
    if (!parsed.success) {
      logError("Assessment creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const assessment = await storage.createMemberAssessment(parsed.data);
    logInfo("New assessment created", { assessmentId: assessment.id });
    res.status(201).json(assessment);
  })
};
