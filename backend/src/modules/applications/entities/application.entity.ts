// ===========================================
// SmartProperty - Rental Application Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  DOCUMENTS_REQUESTED = 'documents_requested',
  VIEWING_SCHEDULED = 'viewing_scheduled',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface EmploymentInfo {
  companyName: string;
  jobTitle: string;
  monthlyIncome: number;
  employmentType?: string;
  startDate?: string;
}

export interface ReferenceInfo {
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface ApplicationQuestionnaire {
  dateOfBirth?: string;
  currentAddress?: string;
  preferredContactChannel?: string;
  occupantsAdults?: number;
  occupantsChildren?: number;
  occupantRelationshipSummary?: string;
  hasPets?: boolean;
  petType?: string;
  petCount?: number;
  smokingStatus?: string;
  desiredMoveInDate?: string;
  leaseDurationPreference?: string;
  monthlyBudgetMin?: number;
  monthlyBudgetMax?: number;
  mandatoryPropertySpecificAnswers?: string;
  employmentStatus?: string;
  contractType?: string;
  netMonthlyIncomeMin?: number;
  netMonthlyIncomeMax?: number;
  coApplicantIncome?: number;
  monthlyDebtPayments?: number;
  currentRentAmount?: number;
  guarantorNeeded?: boolean;
  guarantorName?: string;
  guarantorIncome?: number;
  previousLandlordContact?: string;
  reasonForMoving?: string;
  hadRentPaymentIncidents?: boolean;
  rentPaymentIncidentsExplanation?: string;
}

export interface ApplicationDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  key: string;
  url: string;
  category: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface ApplicationStatusEvent {
  status: ApplicationStatus;
  note?: string;
  changedBy: string;
  changedAt: Date;
}

export interface ViewingSchedule {
  scheduledAt: Date;
  location?: string;
  notes?: string;
  scheduledBy: string;
}

@Entity('applications')
export class Application {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  propertyId!: string;

  @Column()
  tenantId!: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  managerId?: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
  })
  status!: ApplicationStatus;

  @Column('simple-json')
  employmentInfo!: EmploymentInfo;

  @Column('simple-json', { nullable: true })
  references?: ReferenceInfo[];

  @Column({ nullable: true })
  messageToOwner?: string;

  @Column('simple-json', { nullable: true })
  questionnaire?: ApplicationQuestionnaire;

  @Column('simple-json', { nullable: true })
  documents?: ApplicationDocument[];

  @Column('simple-array', { nullable: true })
  requestedDocuments?: string[];

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  applicationDeadline?: Date;

  @Column({ nullable: true })
  deadlineReminderSentAt?: Date;

  @Column('simple-json', { nullable: true })
  viewingSchedule?: ViewingSchedule;

  @Column('simple-json', { nullable: true })
  statusHistory?: ApplicationStatusEvent[];

  @Column({ nullable: true })
  withdrawnAt?: Date;

  @Column({ nullable: true })
  withdrawnReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  get id(): string {
    return this._id.toHexString();
  }

  toJSON() {
    return {
      id: this.id,
      propertyId: this.propertyId,
      tenantId: this.tenantId,
      ownerId: this.ownerId,
      managerId: this.managerId,
      status: this.status,
      employmentInfo: this.employmentInfo,
      references: this.references || [],
      messageToOwner: this.messageToOwner,
      questionnaire: this.questionnaire,
      documents: this.documents || [],
      requestedDocuments: this.requestedDocuments || [],
      rejectionReason: this.rejectionReason,
      applicationDeadline: this.applicationDeadline,
      deadlineReminderSentAt: this.deadlineReminderSentAt,
      viewingSchedule: this.viewingSchedule,
      statusHistory: this.statusHistory || [],
      withdrawnAt: this.withdrawnAt,
      withdrawnReason: this.withdrawnReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
