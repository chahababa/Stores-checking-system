"use server";

import {
  createInspection,
  type InspectionMutationInput,
  updateInspection,
} from "@/lib/inspection";

export async function createInspectionAction(input: InspectionMutationInput) {
  return createInspection(input);
}

export async function updateInspectionAction(
  inspectionId: string,
  input: InspectionMutationInput,
) {
  return updateInspection(inspectionId, input);
}
