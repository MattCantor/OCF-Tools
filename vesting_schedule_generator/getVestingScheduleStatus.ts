import { compareAsc, parseISO } from "date-fns";
import type {
  VestingInstallment,
  VestingScheduleStatus,
  OCFDataBySecurityId,
} from "types";

export const getVestingScheduleStatus = (
  vestingSchedule: VestingInstallment[],
  ocfData: OCFDataBySecurityId
) => {
  const EARLY_EXERCISABLE = !!ocfData.issuanceTransaction.early_exercisable;
  const totalQuantity = parseFloat(ocfData.issuanceTransaction.quantity);

  // sort by vesting date
  vestingSchedule.sort((a, b) => compareAsc(a.date, b.date));

  let totalVested = 0;
  let totalUnvested = totalQuantity;

  const vestingScheduleWithStatus = vestingSchedule.map((installment) => {
    totalVested += installment.quantity;
    totalUnvested -= installment.quantity;

    const status: VestingScheduleStatus = {
      ...installment,
      becameVested: installment.quantity,
      totalVested,
      totalUnvested,
      becameExercisable: EARLY_EXERCISABLE ? 0 : installment.quantity,
    };

    return status;
  });

  // Add an installment for the grant date if the option is EARLY_EXERCISABLE and not fully vested on the grant date

  if (
    (ocfData.issuanceVestingTerms || ocfData.vestingObjects) &&
    EARLY_EXERCISABLE
  ) {
    vestingScheduleWithStatus.unshift({
      date: parseISO(ocfData.issuanceTransaction.date),
      quantity: 0,
      becameVested: 0,
      totalVested: 0,
      totalUnvested: totalQuantity,
      becameExercisable: EARLY_EXERCISABLE ? totalQuantity : 0,
    });
  }

  return vestingScheduleWithStatus;
};
