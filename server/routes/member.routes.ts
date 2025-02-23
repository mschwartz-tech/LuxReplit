import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { insertMemberSchema, insertMemberAssessmentSchema, insertMemberProgressPhotoSchema, insertMemberProfileSchema } from "../../shared/schema";

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

  getAssessment: asyncHandler(async (req: Request, res: Response) => {
    const assessment = await storage.getMemberAssessment(parseInt(req.params.assessmentId));
    if (!assessment) return res.sendStatus(404);
    res.json(assessment);
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
  }),

  getProgressPhotos: asyncHandler(async (req: Request, res: Response) => {
    const photos = await storage.getMemberProgressPhotos(parseInt(req.params.id));
    res.json(photos);
  }),

  getProgressPhoto: asyncHandler(async (req: Request, res: Response) => {
    const photo = await storage.getMemberProgressPhoto(parseInt(req.params.photoId));
    if (!photo) return res.sendStatus(404);
    res.json(photo);
  }),

  createProgressPhoto: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberProgressPhotoSchema.safeParse({
      ...req.body,
      memberId: parseInt(req.params.id)
    });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const photo = await storage.createMemberProgressPhoto(parsed.data);
    res.status(201).json(photo);
  }),

  getMealPlans: asyncHandler(async (req: Request, res: Response) => {
    const plans = await storage.getMemberMealPlans(parseInt(req.params.id));
    res.json(plans);
  }),

  createMealPlan: asyncHandler(async (req: Request, res: Response) => {
    const plan = await storage.createMemberMealPlan({
      ...req.body,
      memberId: parseInt(req.params.id)
    });
    res.status(201).json(plan);
  }),

  updateMealPlan: asyncHandler(async (req: Request, res: Response) => {
    const updated = await storage.updateMemberMealPlan(
      parseInt(req.params.planId),
      req.body
    );
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await storage.getMemberProfile(parseInt(req.params.id));
    if (!profile) return res.sendStatus(404);
    res.json(profile);
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const updated = await storage.updateMemberProfile(parseInt(req.params.id), parsed.data);
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  }),

  createProfile: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberProfileSchema.safeParse({
      ...req.body,
      userId: parseInt(req.params.id)
    });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const profile = await storage.createMemberProfile(parsed.data);
    res.status(201).json(profile);
  }),

  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const progress = await storage.getMemberProgress(parseInt(req.params.id));
    res.json(progress);
  })
};