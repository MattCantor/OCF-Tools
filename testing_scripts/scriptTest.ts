import { VestingScheduleGenerator } from "../vesting_schedule_generator_v1";
import { ocfPackage } from "../vesting_schedule_generator/tests/testOcfPackages/documentation_examples/4yr-1yr-cliff-schedule";
import { TX_Vesting_Start } from "../types";
import { ExecutionPathBuilder } from "../vesting_schedule_generator_v1/execution-path/ExecutionPathBuilder";
import { ExecutionStrategyFactory } from "../vesting_schedule_generator_v1/execution-path/factory";

try {
  const securityId = "equity_compensation_issuance_01";

  const start_event: TX_Vesting_Start = {
    id: "vesting-start",
    object_type: "TX_VESTING_START",
    date: "2025-01-01",
    security_id: "equity_compensation_issuance_01",
    vesting_condition_id: "vesting-start",
  };

  ocfPackage.transactions.push(start_event);

  const vestingSchedule = new VestingScheduleGenerator(
    ocfPackage,
    ExecutionPathBuilder,
    ExecutionStrategyFactory
  ).generateSchedule(securityId);
  console.table(vestingSchedule);
} catch (error) {
  if (error instanceof Error) {
    console.error("Error message:", error.message);
  }
  console.error("Unknown error:", error);
}
