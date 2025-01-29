/**
 * This module processes a directed acyclic graph of vesting conditions to create
 * an execution stack. The stack represents the order in which vesting conditions
 * shoudl be evaluated, ensuring that:
 * 1. No cycles exist in the vesting graph
 * 2. Only one sibling condition is chosent (the earliest)
 * 3. All dependencies are properly orderd
 */

import type { GraphNode, OCFDataBySecurityId } from "types";
import { ShouldBeInExecutionPathStrategyFactory } from "./shouldBeInExecutionPath/factory";
import { compareAsc } from "date-fns";

/**
 * Creates an ordered execution stack from a vesting graph.
 * @param graph - Map of all vesting conditions by ID
 * @param rootNodes - Starting nodes with no parents
 * @param ocfData - Open Cap Format data needed for validation
 * @returns Map of nodes in execution order
 * @throws Error if a cycle is detected in the graph or invalid node found
 */
export const createExecutionStack = (
  graph: Map<string, GraphNode>,
  rootNodes: string[],
  ocfData: OCFDataBySecurityId
): Map<string, GraphNode> => {
  return new ExecutionStackBuilder(graph, rootNodes, ocfData).build();
};

/**
 * Builder class to create an ordered execution stack from a vesting graph
 */
class ExecutionStackBuilder {
  private visited: Set<string>;
  private executionStack: Map<string, GraphNode>;
  private siblingGroups: Map<string, Set<string>>;
  private recusionStack: Set<string>;

  constructor(
    private graph: Map<string, GraphNode>,
    private rootNodes: string[],
    private ocfData: OCFDataBySecurityId
  ) {
    this.visited = new Set<string>();
    this.executionStack = new Map<string, GraphNode>();
    this.siblingGroups = new Map<string, Set<string>>();
    this.recusionStack = new Set<string>();
  }

  public build(): Map<string, GraphNode> {
    this.processSiblings(this.rootNodes);
    return this.executionStack;
  }

  private processSiblings(siblingIds: string[]): void {
    // Check for cycles before processing
    this.detectCycles(siblingIds);

    const validNodes = this.getValidNodes(siblingIds);
    if (validNodes.length === 0) return;

    const earliestNode = this.findEarliestNode(validNodes);
    if (!earliestNode) return;

    this.visited.add(earliestNode.id);
    this.executionStack.set(earliestNode.id, earliestNode);

    // Process children of earliest node as next sibling group
    if (earliestNode.next_condition_ids.length > 0) {
      this.processSiblings(earliestNode.next_condition_ids);
    }
  }

  private detectCycles(nodeIds: string[]): void {
    for (const nodeId of nodeIds) {
      if (this.recusionStack.has(nodeId)) {
        throw new Error(
          `Cycle detected involving the vesting condition with id ${nodeId}`
        );
      }
      this.recusionStack.add(nodeId);
    }
  }

  private getValidNodes(nodeIds: string[]): GraphNode[] {
    return nodeIds
      .filter((id) => !this.visited.has(id))
      .map((id) => {
        const node = this.graph.get(id);
        if (!node) throw new Error(`Node ${id} not found`);

        const strategy =
          ShouldBeInExecutionPathStrategyFactory.getStrategy(node);
        const shouldBeIncluded = new strategy({
          node,
          graph: this.graph,
          executionStack: this.executionStack,
          ocfData: this.ocfData,
        }).execute();

        return shouldBeIncluded ? node : null;
      })
      .filter((node): node is GraphNode => node !== null);
  }

  private findEarliestNode(nodes: GraphNode[]): GraphNode | null {
    if (nodes.length === 0) return null;

    // Find earliest node using date-fns, with array position as tiebreaker
    return nodes.reduce((earliest, current) => {
      if (!earliest) return current;
      const dateComparison = compareAsc(
        current.triggeredDate!,
        earliest.triggeredDate!
      );
      return dateComparison === 0
        ? earliest // Keep earlier array position if there is a tie
        : dateComparison < 0
          ? current // Current is earlier
          : earliest;
    }, nodes[0]);
  }
}
