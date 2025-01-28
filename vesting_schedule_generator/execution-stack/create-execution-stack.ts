import type { GraphNode, OCFDataBySecurityId } from "types";
import { ShouldBeInExecutionPathStrategyFactory } from "./shouldBeInExecutionPath/factory";

// /**
//  * Configuration for processing each node in the vesting graph
//  */
// interface CreateExecutionStackConfig {
//   currentNodeId: string; // Node being processed
//   visited: Set<string>; // Nodes already seen
//   executionStack: Map<string, GraphNode>; // Final execution order
//   graph: Map<string, GraphNode>; // Complete vesting graph
//   recursionStack: Set<string>; // Cycle detection
//   ocfData: OCFDataBySecurityId; // OCT Data for this security id
// }

/**
 * Creates an ordered execution stack from a vesting graph.
 * In the case of sibling nodes in the vesting graph,
 * only one node may enter the execution stack,
 * based on whichever node is determined to have occcurred first in time.
 */
export const createExecutionStack = (
  graph: Map<string, GraphNode>,
  rootNodes: string[],
  ocfData: OCFDataBySecurityId
): Map<string, GraphNode> => {
  const visited = new Set<string>(); // Track visited nodes
  const executionStack = new Map<string, GraphNode>(); // Final execution order
  const siblingGroups = new Map<string, Set<string>>(); // Track sibling groups

  // Process root nodes first (they are siblings)
  const earliestRootNodeId = findEarliestValidNode(
    rootNodes,
    graph,
    ocfData,
    executionStack
  ).earliestId;

  if (earliestRootNodeId) {
    processDFS(earliestRootNodeId, null);
  }

  function processDFS(nodeId: string, parentId: string | null) {
    if (visited.has(nodeId)) return;

    const node = graph.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    visited.add(nodeId);

    // Collect all siblings
    const siblings = parentId
      ? Array.from(siblingGroups.get(parentId) || [])
      : rootNodes;

    const { nodeIsEarliest } = findEarliestValidNode(
      siblings,
      graph,
      ocfData,
      executionStack,
      nodeId
    );

    if (nodeIsEarliest) {
      executionStack.set(nodeId, node);

      if (node.next_condition_ids.length > 0) {
        siblingGroups.set(nodeId, new Set(node.next_condition_ids));
        const { earliestId } = findEarliestValidNode(
          node.next_condition_ids,
          graph,
          ocfData,
          executionStack,
          nodeId
        );
        if (earliestId) {
          processDFS(earliestId, nodeId);
        }
      }
    }
  }

  return executionStack;
};

/**
 * Find the earliest node in the list of node ids
 * if targetNodeToValidate is provided, it will return whether the target node is the earliest
 */
const findEarliestValidNode = (
  nodeIds: string[],
  graph: Map<string, GraphNode>,
  ocfData: OCFDataBySecurityId,
  executionStack: Map<string, GraphNode>,
  nodeIdToValidate?: string
): { earliestId: string | null; nodeIsEarliest: boolean } => {
  // Determine which nodes should be in the execution path
  const validNodes = nodeIds.filter((id) => {
    const node = graph.get(id);
    if (!node) throw new Error(`Node ${id} not found`);

    const strategy = ShouldBeInExecutionPathStrategyFactory.getStrategy(node);
    const shouldBeIncluded = new strategy({
      node,
      graph,
      executionStack,
      ocfData,
    }).execute();

    return shouldBeIncluded;
  });

  // Find earliest triggered node
  const earliest = validNodes.reduce((earliest, current) => {
    const currentNode = graph.get(current)!;
    const earliestNode = graph.get(earliest)!;

    return currentNode.triggeredDate! < earliestNode.triggeredDate!
      ? current
      : earliest;
  }, validNodes[0]);

  return {
    earliestId: earliest,
    nodeIsEarliest: nodeIdToValidate ? earliest === nodeIdToValidate : true,
  };
};
