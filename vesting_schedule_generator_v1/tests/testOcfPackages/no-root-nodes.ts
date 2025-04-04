import { OcfPackageContent } from "../../../read_ocf_package";
import type {
  TX_Equity_Compensation_Issuance,
  TX_Vesting_Event,
  TX_Vesting_Start,
  VestingCondition,
  VestingTerms,
} from "../../types";

const vestingConditions: VestingCondition[] = [
  {
    id: "start-condition",
    description: "start condition",
    quantity: "0",
    trigger: {
      type: "VESTING_START_DATE",
    },
    next_condition_ids: ["event_condition_A", "event_expiration_A"],
  },
  {
    id: "event_condition_A",
    description: "event condition A",
    portion: {
      numerator: "1",
      denominator: "1",
    },
    trigger: {
      type: "VESTING_EVENT",
    },
    next_condition_ids: ["cycle"],
  },
  {
    id: "event_expiration_A",
    description: "event expiration A",
    quantity: "0",
    trigger: {
      type: "VESTING_SCHEDULE_ABSOLUTE",
      date: "2026-01-01",
    },
    next_condition_ids: ["cycle"],
  },
  {
    id: "cycle",
    description: "cycle",
    quantity: "0",
    trigger: {
      type: "VESTING_SCHEDULE_ABSOLUTE",
      date: "2027-01-01",
    },
    next_condition_ids: ["start-condition"],
  },
];

const vestingTerms: VestingTerms[] = [
  {
    id: "no-root-nodes",
    object_type: "VESTING_TERMS",
    name: "no-root-nodes",
    description: "no-root-nodes",
    allocation_type: "CUMULATIVE_ROUND_DOWN",
    vesting_conditions: vestingConditions,
  },
];

const transactions: (
  | TX_Equity_Compensation_Issuance
  | TX_Vesting_Start
  | TX_Vesting_Event
)[] = [
  {
    id: "eci_01",
    object_type: "TX_EQUITY_COMPENSATION_ISSUANCE",
    date: "2025-01-01",
    security_id: "equity_compensation_issuance_01",
    custom_id: "EC-1",
    stakeholder_id: "emilyEmployee",
    security_law_exemptions: [],
    quantity: "4800",
    exercise_price: { amount: "1.0", currency: "USD" },
    early_exercisable: false,
    compensation_type: "OPTION",
    option_grant_type: "ISO",
    expiration_date: "2024-12-31",
    termination_exercise_windows: [
      {
        reason: "VOLUNTARY_GOOD_CAUSE",
        period: 3,
        period_type: "MONTHS",
      },
    ],
    vesting_terms_id: "no-root-nodes",
    valuation_id: "valuation_01",
  },
  {
    object_type: "TX_VESTING_START",
    id: "eci_vs_01",
    security_id: "equity_compensation_issuance_01",
    vesting_condition_id: "start-condition",
    date: "2024-06-01",
  },
];

export const ocfPackage: OcfPackageContent = {
  manifest: [],
  stakeholders: [],
  stockClasses: [],
  transactions: transactions,
  stockLegends: [],
  stockPlans: [],
  vestingTerms: vestingTerms,
  valuations: [],
};
