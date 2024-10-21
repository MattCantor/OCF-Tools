"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const valid_tx_equity_compensation_retraction = (context, event, isGuard = false) => {
    let validity = false;
    let report = { transaction_type: "TX_EQUITY_COMPENSATION_RETRACTION", transaction_id: event.data.id, transaction_date: event.data.date };
    // TBC: validation of tx_equity_compensation_retraction
    const { transactions } = context.ocfPackageContent;
    // Check that equity_compensation issuance in incoming security_id referenced by transaction exists in current state.
    let incoming_equity_compensationIssuance_validity = false;
    context.equity_compensationIssuances.forEach((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type === 'TX_EQUITY_COMPENSATION_ISSUANCE') {
            incoming_equity_compensationIssuance_validity = true;
            report.incoming_equity_compensationIssuance_validity = true;
        }
    });
    if (!incoming_equity_compensationIssuance_validity) {
        report.incoming_equity_compensationIssuance_validity = false;
    }
    // Check to ensure that the date of transaction is the same day or after the date of the incoming equity_compensation issuance.
    let incoming_date_validity = false;
    transactions.forEach((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type === 'TX_EQUITY_COMPENSATION_ISSUANCE') {
            if (ele.date <= event.data.date) {
                incoming_date_validity = true;
                report.incoming_date_validity = true;
            }
        }
    });
    if (!incoming_date_validity) {
        report.incoming_date_validity = false;
    }
    // Check that equity_compensation issuance in incoming security_id does not have a equity_compensation acceptance transaction associated with it.
    let no_equity_compensation_acceptance_validity = false;
    let equity_compensation_acceptance_exists = false;
    transactions.forEach((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type === 'TX_EQUITY_COMPENSATION_ACCEPTANCE') {
            equity_compensation_acceptance_exists = true;
        }
    });
    if (!equity_compensation_acceptance_exists) {
        no_equity_compensation_acceptance_validity = true;
        report.no_equity_compensation_acceptance_validity = true;
    }
    if (!no_equity_compensation_acceptance_validity) {
        report.no_equity_compensation_acceptance_validity = false;
    }
    if (incoming_equity_compensationIssuance_validity &&
        incoming_date_validity &&
        no_equity_compensation_acceptance_validity) {
        validity = true;
    }
    const result = isGuard ? validity : report;
    return result;
};
exports.default = valid_tx_equity_compensation_retraction;
