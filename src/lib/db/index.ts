// Central export — import จากที่นี่ที่เดียว เช่น
//   import { db } from "@/lib/db";
//   const customers = await db.customers.list();

import * as customers from "./customers";
import * as leads from "./leads";
import * as quotations from "./quotations";
import * as routes from "./routes";

export const db = {
  customers: {
    list: customers.listCustomers,
    get: customers.getCustomer,
    create: customers.createCustomer,
    update: customers.updateCustomer,
    delete: customers.deleteCustomer,
  },
  leads: {
    list: leads.listLeads,
    listByCustomer: leads.listLeadsByCustomer,
    create: leads.createLead,
    update: leads.updateLead,
    updateStatus: leads.updateLeadStatus,
    delete: leads.deleteLead,
  },
  quotations: {
    list: quotations.listQuotations,
    create: quotations.createQuotation,
    update: quotations.updateQuotation,
    delete: quotations.deleteQuotation,
  },
  routes: {
    list: routes.listRoutes,
    create: routes.createRoute,
    addStop: routes.addStop,
    updateStop: routes.updateStop,
    deleteStop: routes.deleteStop,
    delete: routes.deleteRoute,
  },
} as const;

export type { Customer, Lead, QuotationDoc, RoutePlan, RouteStop } from "./types";
