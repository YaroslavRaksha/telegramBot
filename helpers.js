const TronWeb = require('tronweb');
const axios = require('axios');

module.exports = {
    createUSDT: async function() {
        const r = await TronWeb.utils.accounts.generateAccount();
        return {
            address: r['address']['base58'],
            key: r['privateKey']
        }
    },
    getUSDTBalance: async function(address) {
        const { data } = await axios.get(`https://apilist.tronscanapi.com/api/account/wallet?address=${address}`);

        if(data.data?.length < 1) return '0';

        else {
            const filterUSDT = data.data.filter((obj) => obj?.token_name === "Tether USD");
            if(filterUSDT?.length < 1)
                return '0';
            else
                return(filterUSDT[filterUSDT?.length - 1]["balance"])
        }
    },

    supportText: 'Інструкція з використання:\n' +
        '1. Щоб дізнатися про ваш баланс, натисніть кнопку /balance.\n' +
        '2. Щоб розпочати переказ, натисніть /pay. Потім введіть картку та суму у форматі (можна кілька рядків у цьому форматі)\n' +
        '0000000000000000 00.00\n' +
        '3. Підтвердіть переказ або скасуйте у Формі.\n' +
        '4. Якщо у Вас кілька карток, можете вносити їх в одне повідомлення за прикладом:' +
        '0000000000000000 00.00\n' +
        '0000000000000000 00.00\n' +
        '0000000000000000 00.00\n' +
        '0000000000000000 00.00\n' +
        'Викликати команди /рау. Баланс можна натисканням кнопки або через "/" (слеш).\n\n' +
        'Зверніть увагу, що після завершення операції біля кожної картки/суми є символи:\n' +
        'РА операція повністю успішна\n' +
        'Ж Операція повністю неуспішна\n\n' +
        "Для зв'язку з підтримкою зверніться: @usdtchange24_support",

    requisitesText: function (address) {
        return 'Для автоматичного поповнення балансу надсилаєте кошти на гаманці\n' +
            `ТЕС20: <pre>${address}</pre>\n\n` +
            '(Щоб скопіювати гаманець, просто натисніть на нього)\n' +
            'Як тільки у Вас у гаманці транзакція набула статусу «виконано», перевіряєте курс, потім натискаєте кнопку «Обміняти» і транзакція буде автоматично зарахована Вам на баланс.'
    },

    coursesText: function (courses) {
        return courses.map((row) => `Від $${row['invoice']}: ${row['course']}\n`).join('');
    }
}
