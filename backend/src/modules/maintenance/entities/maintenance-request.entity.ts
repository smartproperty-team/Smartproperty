import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MaintenanceCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  APPLIANCE = 'appliance',
  STRUCTURAL = 'structural',
  SECURITY = 'security',
  OTHER = 'other',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

export enum MaintenanceStatus {
  SUBMITTED = 'submitted',
  TRIAGED = 'triaged',
  ASSIGNED = 'assigned',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
}

export enum EntryPermissionOption {
  PRESENCE_REQUIRED = 'presence_required',
  CAN_ENTER_WITH_KEY = 'can_enter_with_key',
  CALL_BEFORE_ENTRY = 'call_before_entry',
}

export interface MaintenanceMediaItem {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation?: string;
}

export interface MaintenanceAssignment {
  assigneeId?: string;
  dueDate?: Date;
  slaTargetHours?: number;
  scheduledAt?: Date;
  internalNotes?: string;
}

export interface MaintenanceCostBreakdown {
  labor?: number;
  parts?: number;
  other?: number;
  total?: number;
}

export interface ServiceProviderReport {
  interventionStartedAt?: Date;
  interventionEndedAt?: Date;
  workPerformedSummary?: string;
  reportMedia?: MaintenanceMediaItem[];
  invoiceAmount?: number;
  invoiceReference?: string;
  followUpRequired?: boolean;
}

@Entity('maintenance_requests')
export class MaintenanceRequest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  requesterId!: string;

  @Column()
  requesterRole!: string;

  @Column()
  propertyId!: string;

  @Column({ nullable: true })
  issueTitle?: string;

  @Column({ nullable: true })
  category?: MaintenanceCategory;

  @Column({ nullable: true })
  priority?: MaintenancePriority;

  @Column({ default: false })
  emergency!: boolean;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  locationInProperty?: string;

  @Column({ nullable: true })
  firstSeenAt?: Date;

  @Column({ nullable: true })
  isBlockingUsage?: boolean;

  @Column('simple-json', { nullable: true })
  media?: MaintenanceMediaItem[];

  @Column('simple-array', { nullable: true })
  preferredVisitWindows?: string[];

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  entryPermission?: EntryPermissionOption;

  @Column('simple-json', { nullable: true })
  emergencyContact?: EmergencyContact;

  @Column('simple-json', { nullable: true })
  assignment?: MaintenanceAssignment;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SUBMITTED,
  })
  status!: MaintenanceStatus;

  @Column({ nullable: true })
  statusReason?: string;

  @Column('simple-json', { nullable: true })
  costs?: MaintenanceCostBreakdown;

  @Column({ nullable: true })
  resolutionNotes?: string;

  @Column({ nullable: true })
  closeReason?: string;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column('simple-json', { nullable: true })
  serviceProviderReport?: ServiceProviderReport;

  @Column({ default: false })
  isDraft!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
