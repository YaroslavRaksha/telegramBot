
import { getCourses, getAccess, updateCourse, updateClientBalanceAdmin, getUsers, updateStatus } from './adminHelpers.js';


const checkForPass = async (removedKey) => {

    const key = localStorage.getItem('key') || null;

    if(key && !removedKey) {
        const access = await getAccess(key);
        if(!access.ok) {
            localStorage.removeItem('key');
            alert('Неверный пароль');
            return checkForPass(true);
        }

        return key;
    }

    const prompt = window.prompt('Введите пароль.');
    const access = await getAccess(prompt);

    if(!access.ok) {
        alert('Неверный пароль');
        return checkForPass();
    }

    return localStorage.setItem('key', prompt);
};

window.addEventListener('DOMContentLoaded', async () => {

    await checkForPass();

    const usersTable = document.getElementById('users-table');
    const coursesTable = document.getElementById('courses-table');
    const courses = await getCourses();
    const users = await getUsers();

    if(users) {
        usersTable.innerHTML = '';
        users.map((user) => {
            usersTable.innerHTML += `
                <div class="user-row">
                    <div class="id">${user['id']}</div>
                    <div class="wallet">${user['wallet']}</div>
                    <div class="balance" data-id-handler="${user['id']}">
                        <span>${user['balance']}</span>
                        <input style="display: none" value="${user['balance']}" />
                        <svg class="edit" xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="M4.25 15.75h1.229l7-7-1.229-1.229-7 7Zm11.938-8.208-3.73-3.73 1.021-1.02q.521-.521 1.24-.521t1.239.521l1.25 1.25q.5.5.5 1.239 0 .74-.5 1.24Zm-1.23 1.229L6.229 17.5H2.5v-3.729l8.729-8.729Zm-3.083-.625-.625-.625 1.229 1.229Z"></path></svg>
                    </div>
                    <div class="status" data-id-handler="${user['id']}">
                        <button class="status-btn green ${user['status'] ? 'block' : 'disabled'}"><svg xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="m8.229 14.062-3.521-3.541L5.75 9.479l2.479 2.459 6.021-6L15.292 7Z"/></svg></button>
                        <button class="status-btn red ${user['status'] ? 'disabled' : ''}"><svg xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="M6.062 15 5 13.938 8.938 10 5 6.062 6.062 5 10 8.938 13.938 5 15 6.062 11.062 10 15 13.938 13.938 15 10 11.062Z"/></svg></button>
                    </div>
                </div>`;
        })

        document.querySelectorAll('.status-btn.green').forEach((btn) => {
            const idHandler = btn.parentElement.getAttribute('data-id-handler');

            btn.addEventListener('click', async () => {
                const updatedStatus = await updateStatus(0, idHandler);

                if(!updatedStatus.success) {
                    alert('Произошла ошибка. Перезагрузите страницу')
                    return false;
                }

                document.querySelector(`[data-id-handler='${idHandler}'] .red`).classList.remove('disabled');
                btn.classList.add('disabled');
            });
        });

        document.querySelectorAll('.status-btn.red').forEach((btn) => {
            const idHandler = btn.parentElement.getAttribute('data-id-handler');

            btn.addEventListener('click', async () => {
                const updatedStatus = await updateStatus(1, idHandler);

                if(!updatedStatus.success) {
                    alert('Произошла ошибка. Перезагрузите страницу')
                    return false;
                }

                document.querySelector(`[data-id-handler='${idHandler}'] .green`).classList.remove('disabled');
                btn.classList.add('disabled');
            });
        });

        document.querySelectorAll('.balance .edit').forEach((editBtn) => {
            const idHandler = editBtn.parentElement.getAttribute('data-id-handler');
            const input = document.querySelector(`[data-id-handler='${idHandler}'] input`);
            const value = document.querySelector(`[data-id-handler='${idHandler}'] span `);

            editBtn.addEventListener('click', () => {

                input.style.display = 'block';
                editBtn.style.display = 'none';
                value.style.display = 'none';

            });

            input.addEventListener('keypress', async (e) => {
                if(e.key === 'Enter') {
                    const newBalance = input.value;

                    if(isNaN(newBalance)) {
                        alert('Введите число');
                        return false;
                    }

                    const updatedBalance = await updateClientBalanceAdmin(newBalance, idHandler);

                    if(!updatedBalance.success) {
                        alert('Произошла ошибка. Перезагрузите страницу')
                        return false;
                    }

                    value.innerHTML = newBalance;


                    input.style.display = 'none';
                    editBtn.style.display = 'block';
                    value.style.display = 'block';
                }
            })

        })
    }

    if(courses) {
        coursesTable.innerHTML = '';
        courses.map((row) => {
            coursesTable.innerHTML +=
                `<div class="courses-item" data-invoice="${row['invoice']}">
                    <div>${row['invoice']}:</div>
                    <span>${row['course']}</span>
                    <input type="number" style="display: none;" value="${row['course']}" />
                    <svg class="edit" data-invoice-edit="${row['invoice']}" xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="M4.25 15.75h1.229l7-7-1.229-1.229-7 7Zm11.938-8.208-3.73-3.73 1.021-1.02q.521-.521 1.24-.521t1.239.521l1.25 1.25q.5.5.5 1.239 0 .74-.5 1.24Zm-1.23 1.229L6.229 17.5H2.5v-3.729l8.729-8.729Zm-3.083-.625-.625-.625 1.229 1.229Z"></path></svg>
                    <svg class="submit" style="display: none" xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="m8.229 14.062-3.521-3.541L5.75 9.479l2.479 2.459 6.021-6L15.292 7Z"/></svg>
                </div>`
        });

        document.querySelectorAll('[data-invoice] .edit').forEach((item) => {
            item.addEventListener('click', () => {
                const invoiceValue = item.getAttribute('data-invoice-edit');

                const value = document.querySelector(`[data-invoice='${invoiceValue}'] span`);
                const input = document.querySelector(`[data-invoice='${invoiceValue}'] input`);
                const editBtn = document.querySelector(`[data-invoice='${invoiceValue}'] .edit`);

                value.style.display = 'none';
                editBtn.style.display = 'none';

                input.style.display = 'block';

                input.addEventListener('keypress', async (e) => {
                    if(e.key === 'Enter') {
                        const newCourseValue = input.value;

                        if(isNaN(newCourseValue)) {
                            alert('Введите число');
                            return false;
                        }

                        const updatedCourse = await updateCourse(newCourseValue, invoiceValue);

                        if(!updatedCourse.success) {
                            alert('Произошла ошибка. Перезагрузите страницу')
                            return false;
                        }

                        value.innerHTML = newCourseValue;
                        value.style.display = 'block';
                        editBtn.style.display = 'block';

                        input.style.display = 'none';
                    }
                })
            })

        })

    }

});