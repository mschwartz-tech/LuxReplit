import { writeFile } from 'fs/promises';
import path from 'path';
import { logInfo, logError } from './logger';

interface FeatureStatus {
  name: string;
  status: '🟢' | '🟡' | '🔴' | '✓' | '⬜';
  lastUpdated: Date;
}

interface ProjectProgress {
  memberManagement: {
    crudOperations: FeatureStatus;
    responsiveUI: FeatureStatus;
    membershipStatus: FeatureStatus;
    goalsTracking: FeatureStatus;
  };
  classManagement: {
    scheduleInterface: FeatureStatus;
    memberSignup: FeatureStatus;
    capacityTracking: FeatureStatus;
    mobileBooking: FeatureStatus;
  };
  paymentIntegration: {
    processor: FeatureStatus;
    subscription: FeatureStatus;
    transactionHistory: FeatureStatus;
    mobilePayment: FeatureStatus;
  };
  aiIntegration: {
    openaiSetup: FeatureStatus;
    mealPlans: FeatureStatus;
    workoutPlans: FeatureStatus;
    progressTracking: FeatureStatus;
  };
}

class ProjectStatusTracker {
  private static instance: ProjectStatusTracker;
  private progress: ProjectProgress;
  private statusFilePath: string;
  private lastFileUpdate: Date;
  private updateInterval: number = 60000; // 1 minute

  private constructor() {
    this.statusFilePath = path.join(process.cwd(), 'PROJECT_STATUS.md');
    this.progress = this.initializeProgress();
    this.lastFileUpdate = new Date();
    this.startAutoUpdate();
  }

  public static getInstance(): ProjectStatusTracker {
    if (!ProjectStatusTracker.instance) {
      ProjectStatusTracker.instance = new ProjectStatusTracker();
    }
    return ProjectStatusTracker.instance;
  }

  private startAutoUpdate() {
    setInterval(() => {
      this.updateStatusFile();
    }, this.updateInterval);
  }

  private initializeProgress(): ProjectProgress {
    return {
      memberManagement: {
        crudOperations: { name: 'CRUD operations', status: '✓', lastUpdated: new Date() },
        responsiveUI: { name: 'Responsive UI', status: '✓', lastUpdated: new Date() },
        membershipStatus: { name: 'Membership Status', status: '✓', lastUpdated: new Date() },
        goalsTracking: { name: 'Goals Tracking', status: '🟡', lastUpdated: new Date() }
      },
      classManagement: {
        scheduleInterface: { name: 'Schedule Interface', status: '✓', lastUpdated: new Date() },
        memberSignup: { name: 'Member Signup', status: '✓', lastUpdated: new Date() },
        capacityTracking: { name: 'Capacity Tracking', status: '✓', lastUpdated: new Date() },
        mobileBooking: { name: 'Mobile Booking', status: '🟡', lastUpdated: new Date() }
      },
      paymentIntegration: {
        processor: { name: 'Payment Processor', status: '🔴', lastUpdated: new Date() },
        subscription: { name: 'Subscription Management', status: '🔴', lastUpdated: new Date() },
        transactionHistory: { name: 'Transaction History', status: '🔴', lastUpdated: new Date() },
        mobilePayment: { name: 'Mobile Payment', status: '🔴', lastUpdated: new Date() }
      },
      aiIntegration: {
        openaiSetup: { name: 'OpenAI Setup', status: '🔴', lastUpdated: new Date() },
        mealPlans: { name: 'Meal Plans', status: '🔴', lastUpdated: new Date() },
        workoutPlans: { name: 'Workout Plans', status: '🔴', lastUpdated: new Date() },
        progressTracking: { name: 'Progress Tracking', status: '🔴', lastUpdated: new Date() }
      }
    };
  }

  public updateFeatureStatus(
    category: keyof ProjectProgress,
    feature: string,
    status: FeatureStatus['status']
  ) {
    const categoryFeatures = this.progress[category] as Record<string, FeatureStatus>;
    if (feature in categoryFeatures) {
      categoryFeatures[feature].status = status;
      categoryFeatures[feature].lastUpdated = new Date();
      this.updateStatusFile();
      logInfo(`Updated status for ${category}.${feature} to ${status}`);
    }
  }

  private async updateStatusFile() {
    try {
      const content = this.generateStatusContent();
      await writeFile(this.statusFilePath, content, 'utf8');
      this.lastFileUpdate = new Date();
      logInfo('PROJECT_STATUS.md updated successfully');
    } catch (error) {
      logError('Failed to update PROJECT_STATUS.md', { 
        details: error instanceof Error ? error.toString() : 'Unknown error',
        category: 'statusTracking',
        feature: 'fileUpdate'
      });
    }
  }

  private generateStatusContent(): string {
    const now = new Date();
    return `# Fitness Studio Management Platform - Status Report
Last Updated: ${now.toLocaleString('en-US', { 
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short'
})}

## 🎯 Executive Summary
An intelligent fitness studio management platform leveraging AI and modern web technologies to provide personalized fitness experiences and efficient studio operations.

## 🚨 Current Sprint Priorities

### 1. Core Member Management System (High Priority)
- Status: ${this.getOverallStatus('memberManagement')}
- Completion Criteria:
  - ${this.progress.memberManagement.crudOperations.status} CRUD operations for member profiles
  - ${this.progress.memberManagement.responsiveUI.status} Responsive profile viewing/editing
  - ${this.progress.memberManagement.membershipStatus.status} Membership status workflows
  - ${this.progress.memberManagement.goalsTracking.status} Goals tracking interface

### 2. Class Management System (High Priority)
- Status: ${this.getOverallStatus('classManagement')}
- Completion Criteria:
  - ${this.progress.classManagement.scheduleInterface.status} Admin schedule management interface
  - ${this.progress.classManagement.memberSignup.status} Member registration system
  - ${this.progress.classManagement.capacityTracking.status} Capacity tracking
  - ${this.progress.classManagement.mobileBooking.status} Mobile booking experience

### 3. Payment Integration (High Priority)
- Status: ${this.getOverallStatus('paymentIntegration')}
- Completion Criteria:
  - ${this.progress.paymentIntegration.processor.status} Payment processor integration
  - ${this.progress.paymentIntegration.subscription.status} Subscription workflow
  - ${this.progress.paymentIntegration.transactionHistory.status} Transaction history
  - ${this.progress.paymentIntegration.mobilePayment.status} Mobile payment UI

### 4. AI Feature Integration (Medium Priority)
- Status: ${this.getOverallStatus('aiIntegration')}
- Completion Criteria:
  - ${this.progress.aiIntegration.openaiSetup.status} API integration setup
  - ${this.progress.aiIntegration.mealPlans.status} Plan generation system
  - ${this.progress.aiIntegration.workoutPlans.status} User interface for plans
  - ${this.progress.aiIntegration.progressTracking.status} Progress tracking

## Implementation Status Legend
🟢 Complete | 🟡 In Progress | 🔴 Not Started | ✓ Verified | ⬜ Planned`;
  }

  private getOverallStatus(category: keyof ProjectProgress): FeatureStatus['status'] {
    const features = Object.values(this.progress[category]);
    const statusCounts = features.reduce((acc, feature) => {
      acc[feature.status] = (acc[feature.status] || 0) + 1;
      return acc;
    }, {} as Record<FeatureStatus['status'], number>);

    if (statusCounts['✓'] === features.length) return '✓';
    if (statusCounts['🔴'] === features.length) return '🔴';
    if (statusCounts['🟡'] > 0) return '🟡';
    return '⬜';
  }
}

export const statusTracker = ProjectStatusTracker.getInstance();