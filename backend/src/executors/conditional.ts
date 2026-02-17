import type { ExecutorResult } from "./index";

export function executeConditional(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
): ExecutorResult {
  const conditionType = String(config.conditionType || "expression");
  const condition = String(config.condition || "");
  const field = String(config.field || "");
  const operator = String(config.operator || "equals");
  const compareValue = config.compareValue;

  let result = false;

  if (conditionType === "field_check" && field) {
    // Find the field value in the input data (search nested upstream outputs)
    let fieldValue: unknown = undefined;
    for (const upstreamOutput of Object.values(inputData)) {
      if (typeof upstreamOutput === "object" && upstreamOutput !== null && field in upstreamOutput) {
        fieldValue = (upstreamOutput as Record<string, unknown>)[field];
        break;
      }
    }
    if (fieldValue === undefined) {
      fieldValue = (inputData as Record<string, unknown>)[field];
    }

    switch (operator) {
      case "equals":
        result = String(fieldValue) === String(compareValue);
        break;
      case "not_equals":
        result = String(fieldValue) !== String(compareValue);
        break;
      case "contains":
        result = String(fieldValue).includes(String(compareValue));
        break;
      case "greater_than":
        result = Number(fieldValue) > Number(compareValue);
        break;
      case "less_than":
        result = Number(fieldValue) < Number(compareValue);
        break;
      case "exists":
        result = fieldValue !== undefined && fieldValue !== null;
        break;
      case "is_empty":
        result = !fieldValue || String(fieldValue).trim() === "";
        break;
      case "is_truthy":
        result = !!fieldValue;
        break;
      default:
        result = !!fieldValue;
    }
  } else if (condition) {
    // Simple expression evaluation (safe subset)
    const hasData = Object.keys(inputData).length > 0;
    result = hasData && condition !== "false";
  } else {
    // Default: check if there's any truthy upstream data
    result = Object.keys(inputData).length > 0;
  }

  return {
    output: {
      condition: condition || `${field} ${operator} ${compareValue}`,
      result,
      branch: result ? "true" : "false",
      evaluatedInput: inputData,
    },
  };
}
