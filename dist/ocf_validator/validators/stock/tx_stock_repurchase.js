"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
CURRENT CHECKS:
A stock issuance with a corresponding security ID must exist for the security_id variable
The date of the stock issuance referred to in the security_id must have a date equal to or earlier than the date of the stock repurchase
If applicable, a stock issuance with a corresponding security ID must exist for the balance_security_id variable
The dates of a stock issuance referred to in the balance_security_id variables must have a date equal to the date of the stock repurchase
The quantity variable must be greater than zero and the quantity of the stock_issuance referred to in security_id variable
The quantity of the stock issuance referred to in the balance_security_id variable must be equal to the quantity of the stock issuance referred to in the security_id variable minus the quantity variable
MISSING CHECKS:
The security_id of the stock issuance referred to in the security_id variable must not be the security_id related to any other transactions with the exception of a stock acceptance transaction.
The stock_class_id of the stock issuance in the balance_security_id variable must be the same as the stock_class_id of the stock issuance reffered to in the security_id variable
*/
const valid_tx_stock_repurchase = (context, event, isGuard) => {
    let validity = false;
    let report = { transaction_type: "TX_STOCK_REPURCHASE", transaction_id: event.data.id, transaction_date: event.data.date };
    // TBC: validation of tx_stock_repurchase
    const { transactions } = context.ocfPackageContent;
    let incoming_stockClass = '';
    // 1. Check that stock issuance in incoming security_id referenced by transaction exists in current state.
    let incoming_stockIssuance_validity = false;
    context.stockIssuances.forEach((ele) => {
        if (ele.security_id === event.data.security_id) {
            incoming_stockIssuance_validity = true;
            incoming_stockClass = ele.stock_class_id;
            report.incoming_stockIssuance_validity = true;
        }
    });
    if (!incoming_stockIssuance_validity) {
        report.incoming_stockIssuance_validity = false;
    }
    // 2. Check to ensure that the date of transaction is the same day or after the date of the incoming stock issuance.
    let incoming_date_validity = false;
    context.stockIssuances.forEach((ele) => {
        if (ele.security_id === event.data.security_id) {
            if (ele.date <= event.data.date) {
                incoming_date_validity = true;
                report.incoming_date_validity = true;
            }
        }
    });
    if (!incoming_date_validity) {
        report.incoming_date_validity = false;
    }
    let balance_stockIssuance_validity = true;
    let balance_security_outgoing_date_validity = true;
    let balance_stockClass_validity = true;
    let balance_quantity_validity = true;
    if (event.data.balance_security_id) {
        // 3. Check that stock issuance for the balance security_id referenced by transaction exists in current state.
        balance_stockIssuance_validity = false;
        context.stockIssuances.forEach((ele) => {
            if (ele.security_id === event.data.balance_security_id &&
                ele.object_type === 'TX_STOCK_ISSUANCE') {
                balance_stockIssuance_validity = true;
                balance_security_outgoing_date_validity = false;
                balance_stockClass_validity = false;
                balance_quantity_validity = false;
                report.balance_stockIssuance_validity = true;
                // 4. Check to ensure that the date of transaction is the same day as the date of the balance stock issuance.
                if (ele.date === event.data.date) {
                    balance_security_outgoing_date_validity = true;
                    report.balance_security_outgoing_date_validity = true;
                }
                // 5. Check that the stock class of the balance security_id is the sames as the stock class of the incoming security
                if (ele.stock_class_id === incoming_stockClass) {
                    balance_stockClass_validity = true;
                    report.balance_stockClass_validity = true;
                }
                // 6. Check that the quantity of the balance security_id if it exists is greater than 0
                if (parseFloat(ele.quantity) > 0) {
                    balance_quantity_validity = true;
                    report.balance_quantity_validity = true;
                }
            }
        });
    }
    if (!balance_stockIssuance_validity) {
        report.balance_stockIssuance_validity = false;
    }
    if (!balance_security_outgoing_date_validity) {
        report.balance_security_outgoing_date_validity = false;
    }
    if (!balance_stockClass_validity) {
        report.balance_stockClass_validity = false;
    }
    if (!balance_quantity_validity) {
        report.balance_quantity_validity = false;
    }
    //7. Check that the sum of the quantities of the repurchase (and the balance issuance if it exists) is equal to the quantity of the incoming security.
    let repurchase_and_balance_sum_validity = false;
    let repurchase_and_balance_quantity = parseFloat(event.data.quantity);
    if (event.data.balance_security_id) {
        context.stockIssuances.forEach((ele) => {
            if (ele.security_id === event.data.balance_security_id &&
                ele.object_type === 'TX_STOCK_ISSUANCE') {
                repurchase_and_balance_quantity += parseFloat(ele.quantity);
            }
        });
    }
    context.stockIssuances.forEach((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type === 'TX_STOCK_ISSUANCE') {
            if (repurchase_and_balance_quantity === parseFloat(ele.quantity)) {
                repurchase_and_balance_sum_validity = true;
                report.repurchase_and_balance_sum_validity = true;
            }
        }
    });
    if (!repurchase_and_balance_sum_validity) {
        report.repurchase_and_balance_sum_validity = false;
    }
    // 8. Check repurchase amount is greater than 0 and less than or equal to the incoming security quantity
    let repurchase_quantity_validity = false;
    transactions.map((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type === 'TX_STOCK_ISSUANCE') {
            if (parseFloat(ele.quantity) >= parseFloat(event.data.quantity) &&
                parseFloat(event.data.quantity) > 0) {
                repurchase_quantity_validity = true;
                report.repurchase_quantity_validity = true;
            }
        }
    });
    if (!repurchase_quantity_validity) {
        report.repurchase_quantity_validity = false;
    }
    //9. Check that the security_id of the stock issuance referred to in the security_id variable must not be the security_id related to any other transactions with the exception of a stock acceptance transaction.
    let only_transaction_validity = true;
    transactions.map((ele) => {
        if (ele.security_id === event.data.security_id &&
            ele.object_type !== 'TX_STOCK_ISSUANCE' &&
            ele.object_type !== 'TX_STOCK_ACCEPTANCE' &&
            !(ele.object_type === 'TX_STOCK_REPURCHASE' && ele.id === event.data.id)) {
            only_transaction_validity = false;
            report.only_transaction_validity = false;
        }
    });
    if (only_transaction_validity) {
        report.only_transaction_validity = true;
    }
    if (incoming_stockIssuance_validity &&
        incoming_date_validity &&
        balance_stockIssuance_validity &&
        balance_security_outgoing_date_validity &&
        repurchase_and_balance_sum_validity &&
        repurchase_quantity_validity &&
        balance_stockClass_validity &&
        balance_quantity_validity &&
        only_transaction_validity) {
        validity = true;
    }
    const result = isGuard ? validity : report;
    return result;
};
exports.default = valid_tx_stock_repurchase;
