// Database row types (1:1 with supabase/schema.sql)
// Re-export from store for convenience
export type {
  Customer,
  Lead,
  MonthlyTarget,
  RoutePlan,
  RouteStop,
  ChatMessage,
  TeamNotification,
  QuotationDoc,
  QuotationItem,
  Source,
  Tier,
  Segment,
  LeadStatus,
  Urgency,
  BUType,
  SalesRep,
  LeadCategory,
  TripScope,
  StopStatus,
  DocumentType,
} from "@/store/crmStore";
