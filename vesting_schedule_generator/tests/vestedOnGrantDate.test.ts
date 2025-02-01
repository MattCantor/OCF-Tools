import { VestingInstallment, VestingScheduleService } from "../index";
import { OcfPackageContent } from "../../read_ocf_package";
import {
  TX_Equity_Compensation_Issuance,
  TX_Vesting_Start,
  VestingTerms,
} from "../types";

const vestingTerms: VestingTerms[] = [];

const transactions: (TX_Equity_Compensation_Issuance | TX_Vesting_Start)[] = [
  {
    id: "eci_01",
    object_type: "TX_EQUITY_COMPENSATION_ISSUANCE",
    date: "2024-06-01",
    security_id: "equity_compensation_issuance_01",
    custom_id: "EC-1",
    stakeholder_id: "emilyEmployee",
    security_law_exemptions: [],
    quantity: "4800",
    exercise_price: { amount: "1.0", currency: "USD" },
    early_exercisable: false,
    compensation_type: "OPTION",
    option_grant_type: "ISO",
    expiration_date: "2034-05-31",
    termination_exercise_windows: [
      {
        reason: "VOLUNTARY_GOOD_CAUSE",
        period: 3,
        period_type: "MONTHS",
      },
    ],
    valuation_id: "valuation_01",
  },
];

const ocfPackage: OcfPackageContent = {
  manifest: [],
  stakeholders: [],
  stockClasses: [],
  transactions: transactions,
  stockLegends: [],
  stockPlans: [],
  vestingTerms: vestingTerms,
  valuations: [],
};

describe("VestingScheduleService", () => {
  let service: VestingScheduleService;
  let fullSchedule: VestingInstallment[];

  beforeEach(() => {
    service = new VestingScheduleService(
      ocfPackage,
      "equity_compensation_issuance_01"
    );

    fullSchedule = service.getFullSchedule();
  });

  test("Should have a single vesting event on 2024-06-01 of type Grant Date", () => {
    expect(fullSchedule.length).toEqual(1);
    expect(fullSchedule[0]["Event Type"]).toBe("Grant Date");
  });

  test("Final total vested should equal original quantity", () => {
    console.table(fullSchedule);
    const lastInstallment = fullSchedule[fullSchedule.length - 1];
    const totalVested = lastInstallment["Cumulative Vested"];
    const originalQuantity = 4800;

    expect(totalVested).toEqual(originalQuantity);
  });
});
