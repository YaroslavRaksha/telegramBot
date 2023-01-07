const err = () => {
    alert('Неверный пароль. Почистите кеш и перезагрузите страницу.');
    return false;
};

const getAccess = (key) =>
    fetch('/getAccess', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: key,
        })
    })
        .then((r) => r.json())
        .then((r) => {
            return r;
        });


const getUsers = () =>
    fetch('/getUsers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: localStorage.getItem('key') || '',
        })
    })
        .then((res) => res.json())
        .then((r) => {
            if(!r.ok) err();
            return r.data;
        })

const getCourses = () => {
    return fetch('/selectCourses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: localStorage.getItem('key') || '',
        })
    })
        .then((res) => res.json())
        .then((r) => {
            if(!r.ok) err();
            if(r?.data?.length < 1) {
                alert('Произошла ошибка!');
                return false;
            }
            return r.data;
        });
}

const updateCourse = (newCourse, invoice) =>
    fetch('/updateCourse', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            newCourse: newCourse,
            invoice: invoice,
            key: localStorage.getItem('key') || ''
        })
    })
        .then((res) => res.json())
        .then((r) => {
            if(!r.ok) err();
            return r;
        });

const updateStatus = (status, clientId) =>
    fetch('/updateStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: status,
            clientId: clientId,
            key: localStorage.getItem('key') || '',
        })
    })
        .then((res) => res.json())
        .then((r) => {
            if(!r.ok) err();
            return r;
        });

const updateClientBalanceAdmin = (newBalance, clientId) =>
    fetch('/updateClientBalanceAdmin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            newBalance: newBalance,
            clientId: clientId,
            key: localStorage.getItem('key') || '',
        })
    })
        .then((res) => res.json())
        .then((r) => {
            if(!r.ok) err();
            return r;
        });

export { getCourses, getAccess, updateCourse, getUsers, updateStatus, updateClientBalanceAdmin };