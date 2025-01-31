import { ExecutionPathBuilder } from "../vesting_schedule_generator_v1/execution-path/ExecutionPathBuilder.ts";
import { OcfPackageContent, readOcfPackage } from "../read_ocf_package";
import { VestingScheduleGenerator } from "../vesting_schedule_generator_v1/index.ts";
import { ExecutionStrategyFactory } from "../vesting_schedule_generator_v1/execution-path/factory.ts";

const packagePath = "./testing_scripts/testPackage";
const securityId = "equity_compensation_issuance_01";
const ocfPackage: OcfPackageContent = readOcfPackage(packagePath);

const vestingSchedule = new VestingScheduleGenerator(
  ocfPackage,
  ExecutionPathBuilder,
  ExecutionStrategyFactory
).generateSchedule(securityId);
console.table(vestingSchedule);
