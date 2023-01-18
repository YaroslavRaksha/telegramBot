require("dotenv").config();

const TelegramBot = require('node-telegram-bot-api');
const { createUSDT, getUSDTBalance, supportText, requisitesText, coursesText } = require('./helpers.js');
const { getCourses, updateCourse, getCourseRate, checkIfBalanceLess, updateClientBalanceAdmin, getUsers, updateStatus, getClientAddress, getClientStatus, getClientBalance, updateClientBalance, insertClient } = require('./queries.js');

const express = require("express");
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const path = require("path");

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "admin")));

app.get(`/`, (req, res) => {
    res.sendFile(__dirname + '/admin/admin.html');
});

app.post('*', (req, res, next) => {
    const { key } = req.body;
    if(key === process.env.PASS) {
        return next();
    }

    res.send({ok: false})
});

app.post('/getAccess', async (req,res) => {
    return res.send({ok: true})
})

app.post(`/selectCourses`, async (req, res) => {
    const courses = await getCourses();
    res.send({data: courses, ok: true})
});

app.post('/getUsers', async (req, res) => {
    const users = await getUsers();
    res.send({data: users, ok: true})
});

app.post('/updateStatus', async (req, res) => {
    const { status, clientId } = req.body;

    if(isNaN(status) || isNaN(clientId)) {
        return res.send({success: false});
    }

    const updatedStatus = updateStatus(status, clientId);

    res.send({success: updatedStatus, ok: true})
});

app.post('/updateClientBalanceAdmin', async (req, res) => {
    const { newBalance, clientId } = req.body;

    if(isNaN(newBalance) || isNaN(clientId)) {
        return res.send({success: false, ok: true});
    }

    const updatedBalance = await updateClientBalanceAdmin(newBalance, clientId);

    return res.send({success: updatedBalance, ok: true});
})

app.post('/updateCourse', async (req, res) => {
    const { newCourse, invoice } = req.body;

    if(isNaN(newCourse) || isNaN(invoice)) {
        return res.send({success: false, ok: true});
    }

    const updatedCourse = await updateCourse(newCourse, invoice);

    return res.send({success: updatedCourse, ok: true});
})

app.listen(port, () => {
    console.log(`Server started`);
});

const ADMIN_ID = process.env.ADMIN_ID;

const MAIN_TOKEN = process.env.MAIN_TOKEN;
const MAIN_BOT = new TelegramBot(MAIN_TOKEN, {polling: true});

const USERS_TOKEN = process.env.USERS_TOKEN;
const USERS_BOT = new TelegramBot(USERS_TOKEN, {polling: true});

const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;
const MESSAGES_BOT = new TelegramBot(MESSAGES_TOKEN, {polling: true});


const TRADE = 'Обміняти 🔄';
const PAY = 'Оплата 💳';
const COURSE = 'Курс ⚖';
const TOP_UP = 'Поповнити ⤵';
const BALANCE = 'Баланс 💰';
const SUPPORT = 'Підтримка 🆘';

const CLIENT_KEYBOARD = JSON.stringify({
    resize_keyboard: true,
    keyboard: [
        [{text: TRADE}, {text: TOP_UP}],
        [{text: PAY}, {text: COURSE}],
        [{text: BALANCE}, {text: SUPPORT}]
    ]
});

const CLIENT_SUBMIT = (sum) =>
    JSON.stringify({
        inline_keyboard: [
            [{text: 'Підтвердити', callback_data: JSON.stringify({ command: '/submit_1', sum: sum.toString() })}],
            [{text: 'Скасувати', callback_data: JSON.stringify({ command: '/decline_1' })}],
        ]
    });

const CLIENT_SUBMIT_2 = JSON.stringify({
    inline_keyboard: [
        [{text: 'Підтвердити', callback_data: JSON.stringify({ command: '/submit_2' })}],
        [{text: 'Скасувати', callback_data: JSON.stringify({ command: '/decline_2' })}],
    ]
})

const ADMIN_SUBMIT = (sum) =>
    JSON.stringify({
        inline_keyboard: [
            [{text: 'Подтвердить', callback_data: JSON.stringify({ command: '/submit_1',  sum: sum.toString(), })}],
            [{text: 'Отменить', callback_data: JSON.stringify({  command: '/decline_1',  sum: sum.toString(), })}],
        ]
    });

const ADMIN_SUBMIT_2 =
    JSON.stringify({
        inline_keyboard: [
            [{text: 'Подтвердить', callback_data: JSON.stringify({ command: '/submit_2' })}],
            [{text: 'Отменить', callback_data: JSON.stringify({  command: '/decline_2' })}],
        ]
    });

const getUAHBalance = async (client_id, checkBalance) => {
    const balanceUAH = await getClientBalance(client_id);
    if(!balanceUAH) {
        await MAIN_BOT.sendMessage(client_id, 'Недостаточно средств на UAH балансе.');
        return false;
    }
    if(balanceUAH && checkBalance) {
        return balanceUAH;
    }
    if(balanceUAH && parseFloat(balanceUAH) <= 10) {
        await MAIN_BOT.sendMessage(client_id, 'Сума на вашому гривневому балансі недостатня для здійснення платежу.');
        return false;
    }
    else {
        return balanceUAH;
    }
}

const getConversion = async (client_id, client_address) => {
    const balanceUSDT = await getUSDTBalance(client_address);
    let balance = parseFloat(balanceUSDT);
    if(balance < 2) {
        return MAIN_BOT.sendMessage(client_id, 'Сума на вашому балансу USDT недостатня для здійснення платежу.');
    }

    const courseRate = await getCourseRate(balance);
    const totalSum = balance * parseFloat(courseRate);

    return MAIN_BOT.sendMessage(client_id, `Ви дійсно хочете обміняти ${balance} USDT на гривню по курсу ${courseRate}?\n\n<b>${balance} USDT * ${courseRate} = ${totalSum}грн</b>`, {parse_mode: 'HTML', reply_markup: CLIENT_SUBMIT_2});
};


const getPayment = async (client_id) => {
    const balanceUAH = await getUAHBalance(client_id);
    if(balanceUAH) {
        return await MAIN_BOT.sendMessage(
            client_id,
            'Введіть номер картки та суму у форматі\n\n<b>0000000000000000 00</b>.\n\n' +
            '(номер картки повинен складатися тільки з цифр без пробілів, сума має бути додатним (не нульовим) числом)\n\n' +
            'Або напишіть "скасувати" (або /сапсеї) для скасування операції',
            {parse_mode: 'HTML'});
    }
    else return false;
};


const cardAndBalanceChecker = async (array, client_id) => {
    let checker = true;
    let totalUahBalance = 0;

    for (const text of array) {
        if(checker) {
            const [cardNumber, sum] = text.split(' ');
            const visaPattern = /^(?:4[0-9]{12}(?:[0-9]{3})?)$/;
            const mastPattern = /^(?:5[1-5][0-9]{14})$/;
            const isVisa = visaPattern.test( cardNumber ) === true;
            const isMast = mastPattern.test( cardNumber ) === true;

            if(isNaN(cardNumber) && isNaN(sum)) {
                checker = false;
                return;
            }

            if((isNaN(cardNumber) && !isNaN(sum)) || (!isNaN(cardNumber) && isNaN(sum))) {
                await MAIN_BOT.sendMessage(client_id, 'Невірний формат вводу. Переконайтеся, що номер карти коректний та копійки написані через крапку.');
                checker = false;
                return
            }

            if((isNaN(cardNumber) || isNaN(sum)) || (!isVisa && !isMast)) {
                await MAIN_BOT.sendMessage(client_id, 'Невірний формат вводу.');
                checker = false;
                return;
            }

            if((isVisa || isMast)) {
                if(parseFloat(sum) <= 10) {
                    await MAIN_BOT.sendMessage(client_id, 'Мінімальна сума оплати на картку 10грн.');
                    checker = false;
                }
                else {
                    totalUahBalance += parseFloat(sum);
                }
            }

        }
    }

    if(checker) {
        const balanceIsGood = await checkIfBalanceLess(client_id, totalUahBalance);
        if(balanceIsGood) {
            return totalUahBalance;
        }
        else {
            await MAIN_BOT.sendMessage(client_id, 'Сума на вашому гривневому балансі недостатня для здійснення платежу.');
            return false;
        }
    }

    return false;
}


const checkForCardFormat = async (client_id, text) => {

    const splitFewRowText = text.split('\n');
    const fewCardsFormat = splitFewRowText.length > 1;

    if(fewCardsFormat) {
        const totalUahSum = await cardAndBalanceChecker(splitFewRowText, client_id);
        if(totalUahSum) {
            await MAIN_BOT.sendMessage(client_id, `Ви дійсно бажаєте відправити?\n${splitFewRowText.join('\n')}\n\nЗагальна сума виплат: <b>${totalUahSum}грн</b>`, {parse_mode: 'HTML', reply_markup: CLIENT_SUBMIT(totalUahSum)});
            return true;
        }

        return false;
    }

    if(!fewCardsFormat && text.split(' ').length === 2) {

        const checkSingleCard = await cardAndBalanceChecker([text], client_id);

        if(checkSingleCard) {
            const [cardNumber, sum] = text.split(' ');
            await MAIN_BOT.sendMessage(client_id, `Ви дійсно бажаєте відправити?\n${cardNumber} <b>${sum}грн</b>`, {parse_mode: 'HTML', reply_markup: CLIENT_SUBMIT(sum)});
            return true;
        }
    }

    return false;
};

MAIN_BOT.on('message', async (msg) => {
    const CLIENT_ID = msg.from.id;
    let CLIENT_ADDRESS = await getClientAddress(CLIENT_ID);
    if(!CLIENT_ADDRESS) {
        const { address , key } = await createUSDT();
        await USERS_BOT.sendMessage(ADMIN_ID, `Кошелек:\n<pre>${address}</pre>\n\nКлюч\n<pre>${key}</pre>`, {parse_mode: 'HTML'});
        await insertClient(CLIENT_ID, address)
        CLIENT_ADDRESS = address;
    }

    const CLIENT_STATUS = await getClientStatus(CLIENT_ID)
    if(!CLIENT_STATUS) return;

    const text = msg.text;
    const card = await checkForCardFormat(CLIENT_ID, msg.text);

    if(!card) {
        switch(text) {
            case '/start':
                await MAIN_BOT.sendMessage(CLIENT_ID, supportText, {reply_markup: CLIENT_KEYBOARD});
                break;
            case TOP_UP:
            case '/pay':
                await MAIN_BOT.sendMessage(CLIENT_ID, requisitesText(CLIENT_ADDRESS), {parse_mode: 'HTML'});
                break;
            case BALANCE:
            case '/balance':
                const balanceUSDT = await getUSDTBalance(CLIENT_ADDRESS);
                const balanceUAH = await getUAHBalance(CLIENT_ID, true);
                await MAIN_BOT.sendMessage(CLIENT_ID,`Залишок гривня: <b>${balanceUAH}</b>\nЗашишок USDT: <b>${balanceUSDT}</b>`, {parse_mode: 'HTML'});
                break;
            case TRADE:
                await getConversion(CLIENT_ID, CLIENT_ADDRESS)
                break;
            case PAY:
                await getPayment(CLIENT_ID)
                break;
            case SUPPORT:
                await MAIN_BOT.sendMessage(CLIENT_ID, supportText)
                break;
            case COURSE:
                const courses = await getCourses();
                const coursesMessage = coursesText(courses);
                await MAIN_BOT.sendMessage(CLIENT_ID, `Актуальні курси:\n\n${coursesMessage}`);
                break;
            case '/getid':
                await MAIN_BOT.sendMessage(CLIENT_ID, `Ваш ID користувача: <pre>${CLIENT_ID}</pre>`, {parse_mode: 'HTML'})
                break;
        }
    }
});

MAIN_BOT.on('callback_query', async (query) => {
    const CLIENT_ID = query.from.id;
    const { command } = JSON.parse(query.data);
    const editMsgObj = {
        chat_id: query.from.id,
        message_id: query.message.message_id,
        parse_mode: 'HTML'
    }

    const cardNum = query.message.text.split('бажаєте відправити?\n')[1]?.replace('грн', '');
    const adminCardNum = cardNum?.split('\n\nЗагальна')[0].split('\n').map((text) => {
        const [cardNumber, sum] = text?.split(' ');
        return `${cardNumber}/<b>${sum}</b>`
    })?.join('\n');

    switch(command) {

        case '/submit_1':
            const { sum } = JSON.parse(query.data);
            const updatedBalance = await updateClientBalance({
                clientId: CLIENT_ID,
                sum: sum,
                plus: false
            });

            if(!updatedBalance) {
                await MAIN_BOT.editMessageText('Нажаль, здійснити обмін не вийшло.\nЗверніться у розділ "Підтримка".', editMsgObj);
                break;
            }


            if(updatedBalance && updatedBalance.success) {
                await MESSAGES_BOT.sendMessage(ADMIN_ID, `<i>/${CLIENT_ID}/</i>\nОплата на карту\n\n<pre>${cardNum}</pre>`, {parse_mode: 'HTML', reply_markup: ADMIN_SUBMIT(sum)});
                await MESSAGES_BOT.sendMessage(ADMIN_ID, `${adminCardNum}`, {parse_mode: 'HTML'})
                await MAIN_BOT.editMessageText(`Очікуйте поповнення на <b>${sum}грн</b>.`, editMsgObj);
            }
            break;

        case '/submit_2':
            const conversion = query.message.text.split('\n\n')[1];
            await MESSAGES_BOT.sendMessage(ADMIN_ID,`Пользователь <i>/${CLIENT_ID}/</i> меняет USDT. \n\n<b>${conversion}</b>`, {parse_mode: 'HTML', reply_markup: ADMIN_SUBMIT_2})
            await MAIN_BOT.editMessageText(`Ваша гривня формується, очікуйте поповнення балансу на ${conversion.split('= ')[1]}.`, editMsgObj);
            break;

        case '/decline_1':
            await MAIN_BOT.editMessageText('Операцію відмінено.', editMsgObj);
            break;

        case '/decline_2':
            await MAIN_BOT.editMessageText('Операцію відмінено.', editMsgObj);
            break;

        default:
            await MAIN_BOT.sendMessage(CLIENT_ID, 'Невідома команда.');
            break;
    }
});

MESSAGES_BOT.on('callback_query', async (query) => {
    const { command, sum } = JSON.parse(query.data);

    const queryText = query.message.text;
    const CLIENT_ID = queryText.split('/')[1];

    const cardNum = queryText.split('на карту\n\n')[1]?.split('\nЗагальна')[0];
    const conversion = queryText?.split('\n\n')[1];
    const uahTotal = conversion?.split('= ')[1];

    const editAdminMsgObj = {
        chat_id: query.from.id,
        message_id: query.message.message_id,
        parse_mode: 'HTML'
    }

    switch(command) {
        case '/submit_1':
            await MESSAGES_BOT.editMessageText(`Оплата подверждена ✅\n<pre>${cardNum}</pre>`, editAdminMsgObj);
            await MAIN_BOT.sendMessage(CLIENT_ID, `Оплата успішна ✅\n<pre>${cardNum}</pre>`, { parse_mode: 'HTML'})
            break;

        case '/submit_2':
            const uahSum = conversion.split('= ')[1];
            const updatedBalanceFromConversion = await updateClientBalance({
                clientId: CLIENT_ID,
                sum: uahSum,
                plus: true
            });


            if(!updatedBalanceFromConversion) {
                await MESSAGES_BOT.editMessageText(`<i>${CLIENT_ID}<i/>\nПроизошла ошибка ⛔\n\n${conversion}`, editAdminMsgObj);
                await MAIN_BOT.sendMessage(CLIENT_ID, `❌ Операцію на поповнення ${uahTotal} скасовано.`, { parse_mode: 'HTML'})
                break;
            }


            if(updatedBalanceFromConversion && updatedBalanceFromConversion.success) {
                await MESSAGES_BOT.editMessageText(`<i>${CLIENT_ID}</i>\nКонвертация проведена. ✅\n\n${conversion}\nТекущий баланс пользователя: ${updatedBalanceFromConversion.updatedBalance}`, editAdminMsgObj);
                await MAIN_BOT.sendMessage(CLIENT_ID, `✅ Операція на поповнення ${uahTotal} успішна`);
                break;
            }
            break;

        case '/decline_2':
            await MESSAGES_BOT.editMessageText(`<i>${CLIENT_ID}</i>\nКонвертация отменена ⛔\n\n<b>${queryText.split('\n\n')[1]}</b>`, editAdminMsgObj);
            await MAIN_BOT.sendMessage(CLIENT_ID, `❌ Операцію на поповнення ${uahTotal} скасовано.`, { parse_mode: 'HTML'})
            break;

        case '/decline_1':
            const updatedBalance = await updateClientBalance({
                clientId: CLIENT_ID,
                sum: sum,
                plus: true
            });

            if(!updatedBalance) {
                await MESSAGES_BOT.editMessageText('Произошла ошибка.', editAdminMsgObj);
                await MAIN_BOT.sendMessage(CLIENT_ID, `Оплата <b>${sum}</b> на карту <pre>${cardNum}</pre> отменена ⛔`, { parse_mode: 'HTML'})
            }
            if(updatedBalance && updatedBalance.success) {
                await MESSAGES_BOT.editMessageText(`Оплата отменена ❌️\n<pre>${cardNum}</pre>`, editAdminMsgObj);
                await MAIN_BOT.sendMessage(CLIENT_ID, `Оплату скасовано ❌\n<pre>${cardNum}</pre>`, { parse_mode: 'HTML'})
            }
            break;

        default:
            break;
    }
})


