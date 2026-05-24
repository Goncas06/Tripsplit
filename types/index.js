/**
 * Types as JSDoc for JavaScript
 */

/**
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} Expense
 * @property {string} id
 * @property {number} value
 * @property {'gasolina' | 'portagens' | 'hotel' | 'refeicoes' | 'outros'} category
 * @property {string} paidBy
 * @property {string[]} sharedWith
 * @property {string} [note]
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} name
 * @property {string} destination
 * @property {string} dates
 * @property {Participant[]} participants
 * @property {Expense[]} expenses
 */

/**
 * @typedef {Object} Balance
 * @property {string} debtor
 * @property {string} creditor
 * @property {number} amount
 */

