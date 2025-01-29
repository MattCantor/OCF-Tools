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
    // Start with root nodes - validate and find earliest
    const validRootNodes = this.validateNodes(this.rootNodes);
    const earliestRootNode = this.findEarliestNode(validRootNodes);

    if (earliestRootNode) {
      this.processDFS(earliestRootNode.id, null);
    }

    return this.executionStack;
  }

  private processDFS(nodeId: string, parentId: string | null): void {
    if (this.recusionStack.has(nodeId)) {
      throw new Error(
        `Cycle detected involving the vesting condition with id ${nodeId}`
      );
    }

    if (this.visited.has(nodeId)) return;

    const node = this.graph.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    this.recusionStack.add(nodeId);
    this.visited.add(nodeId);

    // If node is a root or ealiest among siblings, process it
    const siblings = parentId
      ? Array.from(this.siblingGroups.get(parentId) || [])
      : this.rootNodes;

    const validSiblings = this.validateNodes(siblings);
    const earliestSibling = this.findEarliestNode(validSiblings);

    if (!parentId || earliestSibling?.id === nodeId) {
      this.executionStack.set(nodeId, node);

      // Always process children if node is included
      if (node.next_condition_ids.length > 0) {
        this.siblingGroups.set(nodeId, new Set(node.next_condition_ids));
        const validChildren = this.validateNodes(node.next_condition_ids);
        const earliestChild = this.findEarliestNode(validChildren);

        if (earliestChild) {
          this.processDFS(earliestChild.id, nodeId);
        }
      }
    }

    this.recusionStack.delete(nodeId);
  }

  private validateNodes(nodeIds: string[]): GraphNode[] {
    return nodeIds
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

  /**
   * Find the earliest node in the list of node ids
   * if targetNodeToValidate is provided, it will return whether the target node is the earliest
   */
  private findEarliestNode = (nodes: GraphNode[]): GraphNode | null => {
    if (nodes.length === 0) return null;

    return nodes.reduce((earliest, current) =>
      current.triggeredDate! < earliest.triggeredDate! ? current : earliest
    );
  };
}
