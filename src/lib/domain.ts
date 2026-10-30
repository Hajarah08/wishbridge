import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type WishStatus = Enums["wish_status"];
export type WishType = Enums["wish_type"];
export type FulfilmentMethod = Enums["fulfilment_method"];
export type OfferStatus = Enums["offer_status"];
export type ReportReason = Enums["report_reason"];
export type ReportStatus = Enums["report_status"];
export type AccountStatus = Enums["account_status"];
export type SupportStatus = Enums["support_status"];

export const WISH_STATUS_LABELS: Record<WishStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  active: "Active",
  fulfilment_pending: "Fulfilment pending",
  fulfilled: "Fulfilled",
  withdrawn: "Withdrawn",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const WISH_TYPE_LABELS: Record<WishType, string> = {
  physical_gift: "Physical gift",
  financial_goal: "Financial goal",
  experience: "Experience",
  service: "Service",
  other: "Other",
};

export const FULFILMENT_METHOD_LABELS: Record<FulfilmentMethod, string> = {
  gift_purchase: "Someone buys and sends the item",
  monetary_contribution: "Contributions towards a target (test mode)",
  gift_card: "Gift card or voucher",
  service_or_experience: "Someone provides a service or experience",
  other: "Other — explain in the description",
};

export const FULFILMENT_METHOD_SHORT: Record<FulfilmentMethod, string> = {
  gift_purchase: "Gift purchase",
  monetary_contribution: "Contributions",
  gift_card: "Gift card",
  service_or_experience: "Service / experience",
  other: "Other",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  offered: "Offered",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  awaiting_confirmation: "Awaiting confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fraud_or_scam: "Fraud or scam",
  prohibited_item: "Illegal or prohibited request",
  harassment: "Harassment or hate",
  child_safety: "Child safety concern",
  credential_phishing: "Asking for passwords or financial details",
  personal_information: "Shares private personal information",
  spam: "Spam or duplicate",
  other: "Something else",
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export const WISH_STATUS_TONE: Record<WishStatus, Tone> = {
  draft: "neutral",
  pending_review: "info",
  changes_requested: "warning",
  approved: "info",
  active: "accent",
  fulfilment_pending: "warning",
  fulfilled: "success",
  withdrawn: "neutral",
  rejected: "danger",
  suspended: "danger",
};

export const OFFER_STATUS_TONE: Record<OfferStatus, Tone> = {
  offered: "info",
  accepted: "accent",
  declined: "neutral",
  in_progress: "accent",
  awaiting_confirmation: "warning",
  completed: "success",
  cancelled: "neutral",
  disputed: "danger",
};

/** Statuses visible to the public (mirrors private.wish_is_public). */
export const PUBLIC_WISH_STATUSES: WishStatus[] = ["active", "fulfilment_pending", "fulfilled"];

/**
 * Mirror of public.wish_status_transitions, used only to decide which buttons to
 * show. The database is the source of truth and rejects anything else; a test
 * asserts the two stay identical.
 */
export const WISH_TRANSITIONS: { from: WishStatus; to: WishStatus; actor: "owner" | "admin" | "system" }[] = [
  { from: "draft", to: "pending_review", actor: "owner" },
  { from: "draft", to: "withdrawn", actor: "owner" },
  { from: "pending_review", to: "withdrawn", actor: "owner" },
  { from: "changes_requested", to: "pending_review", actor: "owner" },
  { from: "changes_requested", to: "withdrawn", actor: "owner" },
  { from: "approved", to: "active", actor: "owner" },
  { from: "approved", to: "withdrawn", actor: "owner" },
  { from: "active", to: "pending_review", actor: "owner" },
  { from: "active", to: "withdrawn", actor: "owner" },
  { from: "fulfilment_pending", to: "withdrawn", actor: "owner" },
  { from: "fulfilment_pending", to: "fulfilled", actor: "owner" },
  { from: "pending_review", to: "approved", actor: "admin" },
  { from: "pending_review", to: "active", actor: "admin" },
  { from: "pending_review", to: "changes_requested", actor: "admin" },
  { from: "pending_review", to: "rejected", actor: "admin" },
  { from: "approved", to: "suspended", actor: "admin" },
  { from: "active", to: "suspended", actor: "admin" },
  { from: "fulfilment_pending", to: "suspended", actor: "admin" },
  { from: "fulfilled", to: "suspended", actor: "admin" },
  { from: "suspended", to: "active", actor: "admin" },
  { from: "suspended", to: "fulfilled", actor: "admin" },
  { from: "suspended", to: "rejected", actor: "admin" },
  { from: "active", to: "fulfilment_pending", actor: "system" },
  { from: "fulfilment_pending", to: "active", actor: "system" },
  { from: "fulfilment_pending", to: "fulfilled", actor: "system" },
  { from: "approved", to: "suspended", actor: "system" },
  { from: "active", to: "suspended", actor: "system" },
  { from: "fulfilment_pending", to: "suspended", actor: "system" },
];

export function canTransition(from: WishStatus, to: WishStatus, actor: "owner" | "admin" | "system") {
  return WISH_TRANSITIONS.some((t) => t.from === from && t.to === to && t.actor === actor);
}

export const EDITABLE_WISH_STATUSES: WishStatus[] = ["draft", "changes_requested", "pending_review", "active"];
export const IMAGE_EDITABLE_STATUSES: WishStatus[] = ["draft", "changes_requested", "pending_review"];
