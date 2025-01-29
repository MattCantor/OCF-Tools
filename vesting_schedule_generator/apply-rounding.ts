import type { VestingInstallment } from "types";

export const applyRounding = (vestingSchedule: VestingInstallment[]) => {
  let cumulativeRemainder = 0;

  const roundedVestingSchedule = vestingSchedule.reduce((acc, installment) => {
    const installmentRemainder =
      installment.quantity - Math.floor(installment.quantity);

    const newQuantity =
      installment.quantity + cumulativeRemainder + installmentRemainder;

    acc.push({
      ...installment,
      quantity: Math.floor(newQuantity),
    });

    cumulativeRemainder = newQuantity - Math.floor(newQuantity);

    return acc;
  }, [] as VestingInstallment[]);

  return roundedVestingSchedule;
};
