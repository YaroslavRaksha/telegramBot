require("dotenv").config();

const MySql = require('mysql');
const USERS_TABLE = process.env.USERS_TABLE;
const COURSES_TABLE = process.env.COURSES_TABLE;

const connection = MySql.createPool(({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
}));

const GET_COURSES = `SELECT * FROM ${COURSES_TABLE}`;
const GET_USERS = `SELECT * FROM ${USERS_TABLE}`;
const UPDATE_COURSE = `UPDATE ${COURSES_TABLE} SET course = ? WHERE invoice = ?`;
const UPDATE_STATUS = `UPDATE ${USERS_TABLE} SET status = ? WHERE id = ?`;

const GET_WALLET = `SELECT wallet FROM ${USERS_TABLE} WHERE id = ?`;
const GET_BALANCE = `SELECT balance FROM ${USERS_TABLE} WHERE id = ?`;
const GET_STATUS = `SELECT status FROM ${USERS_TABLE} WHERE id = ?`;
const UPDATE_BALANCE = `UPDATE ${USERS_TABLE} SET balance = ? WHERE id = ?`;
const INSERT_CLIENT = `INSERT INTO ${USERS_TABLE} (id, wallet, balance, status) VALUES (?, ?, ?, ?)`;

const QUERY = async (query, values) =>
    new Promise((resolve, reject) =>
        connection.query(query, values, (err, res) => {
            if (err) return err;
            resolve(JSON.parse(JSON.stringify(res)));
        }));

module.exports = {
    getCourses: async function() {
        const res = await QUERY(GET_COURSES, []);
        return res;
    },
    updateCourse: async function(newCourse, invoice) {
        const res = await QUERY(UPDATE_COURSE, [newCourse, invoice]);
        return res?.affectedRows;
    },
    getCourseRate: async function(balance) {
        const courses = await QUERY(GET_COURSES, []);
        let courseRate = null;

        const maxInvoice = parseInt(courses[courses.length - 1].invoice);
        const minInvoice = parseInt(courses[1].invoice);

        if(balance < minInvoice) {
            return courses[0]['course'];
        }

        if(balance > maxInvoice) {
            return courses[courses.length - 1]['course'];
        }

        for(let i = 0; i < courses.length; i++) {
            const invoice = parseInt(courses[i].invoice);
            if(invoice > balance) {
                courseRate = courses[i - 1]['course'];
                break;
            }
        }

        return courseRate;
    },
    updateClientBalanceAdmin: async function (newBalance, clientId) {
        const res = await QUERY(UPDATE_BALANCE, [newBalance, clientId]);
        return res?.affectedRows;
    },
    updateStatus: async function (status, clientId) {
        const res = await QUERY(UPDATE_STATUS, [status, clientId]);
        return res?.affectedRows;
    },
    getUsers: async function () {
        const res = await QUERY(GET_USERS, []);
        return res;
    },
    getClientStatus: async function(clientId) {
        const res = await QUERY(GET_STATUS, [clientId]);
        return res && res[0] ? res[0]['status'] : false;
    },
    getClientAddress: async function(clientId) {
        const res = await QUERY(GET_WALLET, [clientId]);
        return res && res[0] ? res[0]['wallet'] : false;
    },
    getClientBalance: async function (clientId) {
        const res = await QUERY(GET_BALANCE, [clientId]);
        return res && res[0] ? res[0]['balance'] : false;
    },
    checkIfBalanceLess: async function (clientId, totalUahSum) {
        const balance_response = await QUERY(GET_BALANCE, [clientId]);
        if(balance_response && balance_response[0]['balance']) {
            const balance = balance_response[0]['balance'];
            const newBalance = (parseFloat(balance) - parseFloat(totalUahSum));
            if(!isNaN(newBalance) && newBalance >= 0) {
                return true;
            }
        }
        return false;
    },
    updateClientBalance: async function ({clientId, sum, plus}) {
        const balance_response = await QUERY(GET_BALANCE, [clientId]);
        if(balance_response && balance_response[0]['balance']) {
            const balance = balance_response[0]['balance'];

            if(!plus) {
                const updatedBalance = (parseFloat(balance) - parseFloat(sum));
                if(!isNaN(updatedBalance) && updatedBalance >= 0) {
                    const res = await QUERY(UPDATE_BALANCE, [updatedBalance?.toFixed(2), clientId]);
                    if(!res.affectedRows) return false;
                    return { success: true };
                }
            }
            if(plus) {
                const updatedBalance = (parseFloat(balance) + parseFloat(sum));
                if(!isNaN(updatedBalance) && updatedBalance >= 0) {
                    const res = await QUERY(UPDATE_BALANCE, [updatedBalance?.toFixed(2), clientId]);
                    if(!res.affectedRows) return false;
                    return { success: true, updatedBalance: updatedBalance };
                }
            }
        }
        return false;
    },
    insertClient: async function (clientId, wallet) {
        await QUERY(INSERT_CLIENT, [clientId, wallet, 0, 1]);
    }
}
