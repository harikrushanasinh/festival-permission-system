export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
}

// Statuses an organizer is allowed to edit the application fields in (F04/F17).
export const EDITABLE_STATUSES = [ApplicationStatus.DRAFT, ApplicationStatus.CHANGES_REQUESTED];
