import { max } from "date-fns";
import type {
  GraphNode,
  OCFDataBySecurityId,
  VestingInstallment,
} from "../../types";
import Fraction from "fraction.js";

export interface VestingConditionStrategyConfig<T extends GraphNode> {
  node: T; // a node in the vesting grpah - i.e, a vesting condition
  graph: Map<string, GraphNode>; // the vesting graph
  executionPath: Map<string, GraphNode>;
  ocfData: OCFDataBySecurityId;
}

export abstract class VestingConditionStrategy<T extends GraphNode> {
  protected config: VestingConditionStrategyConfig<T>;
  protected parentNodes: GraphNode[];
  constructor(config: VestingConditionStrategyConfig<T>) {
    this.config = config;
    this.parentNodes = this.getParentNodes();
  }

  /**
   * Evaluates whether the node should be in the execution path.
   */
  protected abstract evaluate(): boolean;

  /**
   * Returns the result of the evaluate method and sets the node's triggered date if the evaluate method resolves to true.
   */
  public execute() {
    const evaluateResult = this.evaluate();

    if (evaluateResult) {
      const nodeDate = this.determineNodeDate();
      this.setTriggeredDate(nodeDate);
    }

    return evaluateResult;
  }

  private getParentNodes() {
    const priorConditionIds = this.config.node.prior_condition_ids;
    const parentNodes = priorConditionIds.reduce((acc, priorConditionId) => {
      const priorCondition = this.config.graph.get(priorConditionId);
      if (priorCondition) {
        acc.push(priorCondition);
      }
      return acc;
    }, [] as GraphNode[]);

    return parentNodes;
  }

  /**
   * Determines the triggered date for the node based on its own trigger type.
   * Only called if the evaluate method resolves to true.
   * Will be compared against the triggered dates of the nodes's parents in the setTriggeredDate method
   */
  protected abstract determineNodeDate(): Date;

  /**
   * Determines the triggered dates of all parent nodes
   * @returns Date[]
   */
  protected determineParentNodeDates() {
    if (this.parentNodes.length === 0) {
      return null;
    }

    const parentDates = [...this.parentNodes].reduce((acc, parentNode) => {
      if (!parentNode.triggeredDate) {
        return acc;
      }

      acc.push(parentNode.triggeredDate);
      return acc;
    }, [] as Date[]);

    return parentDates;
  }

  /**
   * Determines the latest triggered date of this node's parents.
   * @returns Date
   */
  protected determineLatestParentDate() {
    const parentDates = this.determineParentNodeDates();

    if (parentDates === null) {
      return null;
    }

    return max(parentDates);
  }

  /**
   * Sets this node's triggered date as the later of its own triggered date and those of its parents.
   * @param nodeDate
   */
  protected setTriggeredDate(nodeDate: Date) {
    const latestParentDate = this.determineLatestParentDate();
    if (latestParentDate) {
      const latestDate = max([latestParentDate, nodeDate]);
      this.config.node.triggeredDate = latestDate;
      return;
    }
    this.config.node.triggeredDate = nodeDate;
    return;
  }

  protected getSharesVesting(vestedCount: number): Fraction {
    const totalShares = parseFloat(
      this.config.ocfData.issuanceTransaction.quantity
    );

    if (this.config.node.quantity) {
      return new Fraction(parseFloat(this.config.node.quantity));
    }

    if (this.config.node.portion) {
      const numerator = parseFloat(this.config.node.portion.numerator);
      const denominator = parseFloat(this.config.node.portion.denominator);

      if (denominator === 0) {
        // TODO Consider throwing an error or warning here
        return new Fraction(0);
      }

      const portion = new Fraction(numerator, denominator);

      if (this.config.node.portion.remainder) {
        const remainingUnvestedShares = totalShares - vestedCount;
        return portion.mul(new Fraction(remainingUnvestedShares));
      }

      return portion.mul(new Fraction(totalShares));
    }

    return new Fraction(totalShares);
  }

  public getInstallments(vestedCount: number): VestingInstallment[] {
    const sharesVesting = this.getSharesVesting(vestedCount).valueOf();
    if (sharesVesting === 0) return [];

    const installment = {
      date: this.config.node.triggeredDate!,
      quantity: sharesVesting,
    };

    return [installment];
  }
}
