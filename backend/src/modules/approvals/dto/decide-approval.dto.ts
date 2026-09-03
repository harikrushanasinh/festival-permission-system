import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApprovalDecision } from '../approval-decision.enum.js';

export class DecideApprovalDto {
  @IsEnum([ApprovalDecision.APPROVED, ApprovalDecision.REJECTED, ApprovalDecision.CHANGES_REQUESTED])
  decision!: ApprovalDecision.APPROVED | ApprovalDecision.REJECTED | ApprovalDecision.CHANGES_REQUESTED;

  // Required for REJECTED/CHANGES_REQUESTED (F17), optional for APPROVED.
  @ValidateIf((o) => o.decision !== ApprovalDecision.APPROVED)
  @IsString()
  reason?: string;
}
