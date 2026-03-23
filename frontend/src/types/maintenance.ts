export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "structural"
  | "security"
  | "other";

export type MaintenancePriority = "low" | "medium" | "high" | "emergency";

export type MaintenanceStatus =
  | "submitted"
  | "triaged"
  | "assigned"
  | "scheduled"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "closed"
  | "canceled"
  | "rejected";

export type EntryPermissionOption =
  | "presence_required"
  | "can_enter_with_key"
  | "call_before_entry";

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

export interface CreateMaintenanceRequestDto {
  propertyId: string;
  issueTitle?: string;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  emergency?: boolean;
  description?: string;
  locationInProperty?: string;
  firstSeenAt?: string;
  isBlockingUsage?: boolean;
  media?: MaintenanceMediaItem[];
  preferredVisitWindows?: string[];
  contactPhone?: string;
  entryPermission?: EntryPermissionOption;
  emergencyContact?: EmergencyContact;
  saveAsDraft?: boolean;
}

export interface MaintenanceRequest {
  id: string;
  requesterId: string;
  requesterRole: string;
  propertyId: string;
  issueTitle?: string;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  emergency: boolean;
  description?: string;
  locationInProperty?: string;
  firstSeenAt?: string;
  isBlockingUsage?: boolean;
  media: MaintenanceMediaItem[];
  preferredVisitWindows: string[];
  contactPhone?: string;
  entryPermission?: EntryPermissionOption;
  emergencyContact?: EmergencyContact;
  status: MaintenanceStatus;
  statusReason?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}
