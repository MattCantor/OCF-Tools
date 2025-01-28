import type { GraphNode } from "types";
import {
  ShouldBeInExecutionPathStrategy,
  ShouldBeInExecutionPathStrategyConfig,
} from "./strategies/strategy";
import { VestingAbsoluteShouldBeInExecutionPath } from "./strategies/vesting_absolute";
import { VestingEventShouldBeInExecutionPath } from "./strategies/vesting_event";
import { VestingRelativeShouldBeInExecutionPath } from "./strategies/vesting_relative";
import { VestingStartShouldBeInExecutionPath } from "./strategies/vesting_start";

export class ShouldBeInExecutionPathStrategyFactory {
  static getStrategy<T extends GraphNode>(node: T) {
    switch (node.trigger.type) {
      case "VESTING_START_DATE":
        return VestingStartShouldBeInExecutionPath as unknown as new (
          config: ShouldBeInExecutionPathStrategyConfig<T>
        ) => ShouldBeInExecutionPathStrategy<T>;
      case "VESTING_EVENT":
        return VestingEventShouldBeInExecutionPath as unknown as new (
          config: ShouldBeInExecutionPathStrategyConfig<T>
        ) => ShouldBeInExecutionPathStrategy<T>;
      case "VESTING_SCHEDULE_ABSOLUTE":
        return VestingAbsoluteShouldBeInExecutionPath as unknown as new (
          config: ShouldBeInExecutionPathStrategyConfig<T>
        ) => ShouldBeInExecutionPathStrategy<T>;
      case "VESTING_SCHEDULE_RELATIVE":
        return VestingRelativeShouldBeInExecutionPath as unknown as new (
          config: ShouldBeInExecutionPathStrategyConfig<T>
        ) => ShouldBeInExecutionPathStrategy<T>;
    }
  }
}
