import { OcfPackageContent } from "../read_ocf_package";
import { getOCFDataBySecurityId } from "./get-ocf-data-by-security-id.ts";
// import { createExecutionStack } from "./execution-stack/create-execution-stack.ts";
import { createVestingGraph } from "./create-vesting-graph.ts";
import {
  GraphNode,
  OCFDataBySecurityId,
  VestingInstallment,
} from "types/index.ts";
import { applyRounding } from "./apply-rounding.ts";
import { parseISO } from "date-fns";
import { processFirstVestingDate } from "./first-vesting-date.ts";
import { VestingScheduleService } from "./create_installment/vestingScheduleService.ts";
import { ExecutionStackBuilder } from "./execution-stack/create-execution-stack.ts";
import { IExecutionPathStrategyFactory } from "./execution-stack/shouldBeInExecutionPath/factory.ts";

export class VestingScheduleGenerator {
  private vestingSchedule: VestingInstallment[];
  constructor(
    private ocfPackage: OcfPackageContent,
    private executionStackBuilder: new (
      graph: Map<string, GraphNode>,
      rootNodes: string[],
      ocfData: OCFDataBySecurityId,
      executionPathStrategyFactory: IExecutionPathStrategyFactory
    ) => ExecutionStackBuilder,
    private executionPathStrategyFactory: IExecutionPathStrategyFactory
  ) {
    this.vestingSchedule = [];
  }

  private getOCFData(securityId: string): OCFDataBySecurityId {
    return getOCFDataBySecurityId(this.ocfPackage, securityId);
  }

  /**
   * If both `vesting_terms_id` and `vestings` are provided, defer to the `vesting_terms_id`.
   * Absence of both `vesting_terms_id` and `vestings` means the shares are fully vested on issuance.
   */
  private getStrategy(OCFDataBySecurityId: OCFDataBySecurityId) {
    if (OCFDataBySecurityId.issuanceVestingTerms) {
      return this.imperativeStrategy(OCFDataBySecurityId);
    } else if (OCFDataBySecurityId.vestingObjects) {
      return this.declarativeStrategy(OCFDataBySecurityId);
    } else {
      return this.fullyVestedStrategy(OCFDataBySecurityId);
    }
  }

  private imperativeStrategy(OCFDataBySecurityId: OCFDataBySecurityId) {
    // Prepare vesting conditions
    const vestingConditions =
      OCFDataBySecurityId.issuanceVestingTerms!.vesting_conditions;
    const graphNodes = vestingConditions.map((vc) => {
      const graphNode: GraphNode = {
        ...vc,
        triggeredDate: undefined,
        prior_condition_ids: [],
      };

      return graphNode;
    });

    // Create vesting graph
    const { graph, rootNodes } = createVestingGraph(graphNodes);

    // Create the execution stack
    const executionStackBuilder = new this.executionStackBuilder(
      graph,
      rootNodes,
      OCFDataBySecurityId,
      this.executionPathStrategyFactory
    );
    const executionStack = executionStackBuilder.build();

    // Create installments from the execution stack
    const service = new VestingScheduleService(
      OCFDataBySecurityId,
      executionStack
    );

    for (const node of executionStack.values()) {
      const installments = service.createInstallments(node);
      service.addToVestingSchedule(installments);
    }

    return service.vestingSchedule;
  }

  private declarativeStrategy(OCFDataBySecurityId: OCFDataBySecurityId) {
    return OCFDataBySecurityId.vestingObjects!.map((obj) => ({
      date: parseISO(obj.date),
      quantity: parseFloat(obj.amount),
    }));
  }

  private fullyVestedStrategy(OCFDataBySecurityId: OCFDataBySecurityId) {
    return [
      {
        date: parseISO(OCFDataBySecurityId.issuanceTransaction.date),
        quantity: parseFloat(OCFDataBySecurityId.issuanceTransaction.quantity),
      },
    ];
  }

  public generate(securityId: string): VestingInstallment[] {
    const OCFDataBySecurityId = this.getOCFData(securityId);
    this.vestingSchedule = this.getStrategy(OCFDataBySecurityId);

    const roundedSchedule = applyRounding(this.vestingSchedule);

    const grantDate = parseISO(OCFDataBySecurityId.issuanceTransaction.date);
    this.vestingSchedule = processFirstVestingDate(roundedSchedule, grantDate);

    const totalSharesUnderlying = parseFloat(
      OCFDataBySecurityId.issuanceTransaction.quantity
    );
    const totalSharesVested = this.vestingSchedule.reduce(
      (acc, installment) => {
        return (acc += installment.quantity);
      },
      0
    );

    if (totalSharesVested > totalSharesUnderlying) {
      throw new Error(
        `More shares are scheduled to vest than underlie equity issuance with security id ${OCFDataBySecurityId.issuanceTransaction.id}`
      );
    }

    return this.vestingSchedule;
  }
}

// export const generateVestingSchedule = (
//   ocfPackage: OcfPackageContent,
//   securityId: string
// ): VestingInstallment[] => {
//   /**********************************
//    * Get OCF Data for the securityId
//    **********************************/

//   const ocfData = getOCFDataBySecurityId(ocfPackage, securityId);

//   /**************************************************************************************************
//    * Apply the strategy
//    *
//    * If both `vesting_terms_id` and `vestings` are provided, defer to the `vesting_terms_id`.
//    * Absence of both `vesting_terms_id` and `vestings` means the shares are fully vested on issuance.
//    *
//    * TODO: Indicate whether this is natural language rule is already documented anywhere
//    **************************************************************************************************/

//   let vestingSchedule: VestingInstallment[];

//   /******************************
//    * If a `vesting_terms_id` is provided
//    *
//    * Prepare vesting conditions
//    * Create vesting graph
//    * Create the execution stack from the graph of vesting conditions
//    ******************************/
//   if (ocfData.issuanceVestingTerms) {
//     /******************************
//      * Prepare vesting conditions
//      ******************************/
//     const vestingConditions = ocfData.issuanceVestingTerms!.vesting_conditions;
//     const graphNodes = vestingConditions.map((vc) => {
//       const graphNode: GraphNode = {
//         ...vc,
//         triggeredDate: undefined,
//         prior_condition_ids: [],
//       };

//       return graphNode;
//     });

//     /******************************
//      * Create vesting graph
//      ******************************/

//     const { graph, rootNodes } = createVestingGraph(graphNodes);

//     /******************************
//      * Create the execution stack
//      ******************************/
//     const executionStack = createExecutionStack(graph, rootNodes, ocfData);

//     /******************************************************************************************************
//      * Create installments from the execution stack
//      *
//      * Processing is deferred for nodes that are part of an EARLIER_OF or LATER_OF relationship
//      * Instead the vesting installments for these nodes are created when the relationship node is processed
//      ******************************************************************************************************/

//     const service = new VestingScheduleService(ocfData, executionStack);

//     for (const node of executionStack.values()) {
//       const installments = service.createInstallments(node);
//       service.addToVestingSchedule(installments);
//     }

//     vestingSchedule = service.vestingSchedule;

//     /******************************
//      * If Vesting Objects are provided
//      ******************************/
//   } else if (ocfData.vestingObjects) {
//     vestingSchedule = ocfData.vestingObjects.map((obj) => ({
//       date: parseISO(obj.date),
//       quantity: parseFloat(obj.amount),
//     }));

//     /******************************
//      * If fully vested on the grant date
//      ******************************/
//   } else {
//     vestingSchedule = [
//       {
//         date: parseISO(ocfData.issuanceTransaction.date),
//         quantity: parseFloat(ocfData.issuanceTransaction.quantity),
//       },
//     ];
//   }

//   /******************************
//    * Apply Rounding
//    ******************************/

//   const roundedSchedule = applyRounding(vestingSchedule);

//   /*********************************************************************
//    * Address if the grant date is after the first scheduled vesting date
//    **********************************************************************/

//   const grantDate = parseISO(ocfData.issuanceTransaction.date);
//   const processedSchedule = processFirstVestingDate(roundedSchedule, grantDate);

//   /*****************************************
//    * Evaluate total number of shares vested
//    *****************************************/

//   const totalSharesUnderlying = parseFloat(
//     ocfData.issuanceTransaction.quantity
//   );
//   const totalSharesVested = processedSchedule.reduce((acc, installment) => {
//     return (acc += installment.quantity);
//   }, 0);

//   /*
//   TODO
//   Consider throwing a warning if not all shares are scheduled to vest
//   throw new Error(`Not all shares underlying equity issuance with security id ${ocfData.issuanceTransaction.id} are scheduled to vest`)
//   */

//   if (totalSharesVested > totalSharesUnderlying) {
//     throw new Error(
//       `More shares are scheduled to vest than underlie equity issuance with security id ${ocfData.issuanceTransaction.id}`
//     );
//   }

//   return processedSchedule;
// };
